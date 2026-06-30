import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import Delivery from "../../../models/Delivery";
import DeliveryAssignment from "../../../models/DeliveryAssignment";
import Return from "../../../models/Return";
import Commission from "../../../models/Commission";
import { debitWallet, creditWallet } from "../../../services/walletManagementService";
import { processCustomerWalletTransaction } from "../../../services/walletService";
import { notifySellersOfOrderUpdate } from "../../../services/sellerNotificationService";
import { notifyDeliveryBoysOfReturnPickup } from "../../../services/returnNotificationService";
import AppSettings from "../../../models/AppSettings";
import { Server as SocketIOServer } from "socket.io";

import { decrypt } from "../../../utils/encryptionUtils";

/**
 * Get all orders with filters
 */
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      seller,
      dateFrom,
      dateTo,
      search,
      sortBy = "orderDate",
      sortOrder = "desc",
      adminRefundStatus,
    } = req.query;

    const query: any = { isParent: { $ne: true } };

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (adminRefundStatus) query.adminRefundStatus = adminRefundStatus;
    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.orderDate.$lte = new Date(dateTo as string);
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search as string, $options: "i" } },
        { customerName: { $regex: search as string, $options: "i" } },
        { customerEmail: { $regex: search as string, $options: "i" } },
        { customerPhone: { $regex: search as string, $options: "i" } },
      ];
    }

    // If seller filter, need to check order items
    if (seller) {
      const orderItems = await OrderItem.find({ seller }).distinct("order");
      query._id = { $in: orderItems };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sort: any = {};
    if (sortBy) {
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("customer", "name email phone")
        .populate("deliveryBoy", "name mobile")
        .populate("items")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get order by ID
 */
export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("customer", "name email phone bankDetails")
      .populate("deliveryBoy", "name mobile email")
      .populate({
        path: "items",
        populate: [
          {
            path: "product",
            select: "productName mainImage",
          },
          {
            path: "seller",
            select: "sellerName storeName",
          },
        ],
      })
      .populate("cancelledBy", "firstName lastName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const commissions = await Commission.find({ order: id })
      .populate("seller", "sellerName storeName");

    const orderObj = order.toObject();
    const customer = orderObj.customer as any;
    if (customer && customer.bankDetails) {
      customer.bankDetails = {
        accountName: decrypt(customer.bankDetails.accountName || ""),
        accountNumber: decrypt(customer.bankDetails.accountNumber || ""),
        bankName: decrypt(customer.bankDetails.bankName || ""),
        ifscCode: decrypt(customer.bankDetails.ifscCode || ""),
        upiId: decrypt(customer.bankDetails.upiId || ""),
      };
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: {
        ...orderObj,
        commissions
      },
    });
  }
);

/**
 * Update order status
 */
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = [
      "Received",
      "Pending",
      "Processed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Rejected",
      "Returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const previousStatus = existingOrder.status;

    existingOrder.status = status;
    if (adminNotes) existingOrder.adminNotes = adminNotes;

    if (status === "Delivered") {
      existingOrder.deliveredAt = new Date();
    }

    if (status === "Cancelled") {
      existingOrder.cancelledAt = new Date();
      if (req.user?.userId) {
        existingOrder.cancelledBy = new mongoose.Types.ObjectId(req.user.userId);
      }
    }

    await existingOrder.save();

    const order = await Order.findById(id)
      .populate("customer", "name email phone")
      .populate("deliveryBoy", "name mobile")
      .populate("items");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if ((status === "Cancelled" || status === "Rejected") && previousStatus !== "Cancelled" && previousStatus !== "Rejected") {
      try {
        const { restoreProductStock } = require("../../../services/orderService");
        await restoreProductStock(order._id.toString());
      } catch (err) {
        console.error("Error restoring stock on admin cancellation:", err);
      }
    }

    if (status === "Delivered") {
      try {
        const { distributeCommissions } = require("../../../services/commissionService");
        await distributeCommissions(order._id.toString());
        console.log(`[Admin Order Update] Manual delivery triggered commission and return-window lock distribution for Order ${order._id}`);
      } catch (commErr) {
        console.error("Error distributing commissions on admin manual delivery:", commErr);
      }
    }

    // Trigger notification if status is "Processed" (Confirmed) or if paymentStatus changed to "Paid"
    if (status === "Processed" || order.paymentStatus === "Paid") {
      const io: SocketIOServer = req.app.get("io");
      if (io) {
        notifySellersOfOrderUpdate(io, order, "STATUS_UPDATE");
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  }
);

/**
 * Assign delivery boy to order
 */
export const assignDeliveryBoy = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required",
      });
    }

    // Verify delivery boy exists and is active
    const deliveryBoy = await Delivery.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    if (deliveryBoy.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is not active",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order
    order.deliveryBoy = deliveryBoyId as any;
    order.deliveryBoyStatus = "Assigned";
    order.assignedAt = new Date();
    await order.save();

    // Create or update delivery assignment
    await DeliveryAssignment.findOneAndUpdate(
      { order: id },
      {
        order: id,
        deliveryBoy: deliveryBoyId,
        assignedAt: new Date(),
        assignedBy: req.user?.userId,
        status: "Assigned",
      },
      { upsert: true, new: true }
    );

    const updatedOrder = await Order.findById(id)
      .populate("customer", "name email phone")
      .populate("deliveryBoy", "name mobile email")
      .populate("items");

    return res.status(200).json({
      success: true,
      message: "Delivery boy assigned successfully",
      data: updatedOrder,
    });
  }
);

/**
 * Get orders by status
 */
export const getOrdersByStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const validStatuses = [
      "Received",
      "Pending",
      "Processed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Rejected",
      "Returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      Order.find({ status, isParent: { $ne: true } })
        .populate("customer", "name email phone")
        .populate("deliveryBoy", "name mobile")
        .populate("items")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Order.countDocuments({ status, isParent: { $ne: true } }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Orders with status ${status} fetched successfully`,
      data: orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get all return requests
 */
export const getReturnRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      seller,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const settings = await AppSettings.getSettings();
    const defaultPickupFee = settings?.returnPickupFee || 20;

    const query: any = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Date filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo as string);
      }
    }

    // Search filter (complex because we need to search populated fields)
    // For now, simpler implementation - search by order ID or return reason or customer
    if (search) {
      // Find orders matching search first
      const orders = await Order.find({
        orderNumber: { $regex: search as string, $options: "i" },
      }).select("_id");
      const orderIds = orders.map((o) => o._id);

      query.$or = [
        { order: { $in: orderIds } },
        { reason: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    // Seller filter requires looking up order items
    if (seller && seller !== "all") {
      // Find order items for this seller
      const orderItems = await OrderItem.find({ seller }).select("_id");
      const orderItemIds = orderItems.map((oi) => oi._id);
      query.orderItem = { $in: orderItemIds };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = {};
    if (sortBy && sortBy !== "undefined") {
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [requests, total] = await Promise.all([
      Return.find(query)
        .populate("order", "orderNumber")
        .populate("customer", "name email phone bankDetails")
        .populate("deliveryBoy", "name phone")
        .populate({
          path: "orderItem",
          populate: {
            path: "product",
            select: "productName mainImage variations",
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Return.countDocuments(query),
    ]);

    // Transform logic to match frontend expectations if necessary
    // AdminReturnRequest.tsx expects: _id, orderItemId, userName, productName, variant, price, quantity, total, status, requestedAt
    // It seems flattened. Let's send structured data and let frontend handle it, or flatten it here.
    // The frontend uses "request.orderItemId", "request.userName", "request.productName" etc.
    // This implies a flattened structure.

    const transformedRequests = requests.map((req: any) => {
      const custObj = req.customer && typeof req.customer.toObject === "function" ? req.customer.toObject({ getters: true }) : req.customer;
      const bankDetails = custObj?.bankDetails ? {
        accountName: decrypt(custObj.bankDetails.accountName || ""),
        accountNumber: decrypt(custObj.bankDetails.accountNumber || ""),
        bankName: decrypt(custObj.bankDetails.bankName || ""),
        ifscCode: decrypt(custObj.bankDetails.ifscCode || ""),
        upiId: decrypt(custObj.bankDetails.upiId || ""),
      } : null;

      const orderItem = req.orderItem;
      const product = orderItem?.product;
      let productImage = orderItem?.productImage || product?.mainImage || "";
      let variantText = orderItem?.variation || "-";

      if (product && product.variations && Array.isArray(product.variations)) {
        const matchingVar = product.variations.find((v: any) => v._id?.toString() === orderItem?.variation || v.id === orderItem?.variation);
        if (matchingVar) {
          variantText = `${matchingVar.name ? matchingVar.name + ': ' : ''}${matchingVar.value || matchingVar.name || orderItem?.variation}`;
          if (matchingVar.image && matchingVar.image.trim() !== "") {
            productImage = matchingVar.image;
          }
        } else if ((!productImage || productImage.trim() === "") && product.variations.length > 0 && product.variations[0]?.image) {
          productImage = product.variations[0].image;
        }
      }
      if (!productImage) productImage = "https://via.placeholder.com/150?text=No+Image";

      return {
        _id: req._id,
        orderId: req.order?._id,
        orderNumber: req.order?.orderNumber,
        orderItemId: req.orderItem?._id, // Frontend displays this
        userId: req.customer?._id,
        userName: req.customer?.name || "Unknown",
        // product info from orderItem
        productId: req.orderItem?.product?._id,
        productName: req.orderItem?.productName || "Unknown Product",
        variant: variantText,
        productImage,
        price: req.orderItem?.unitPrice || 0,
        quantity: req.quantity,
        total: req.quantity * (req.orderItem?.unitPrice || 0),
        reason: req.reason,
        status: req.status,
        requestedAt: req.createdAt,
        processedAt: req.processedAt,
        description: req.description || "",
        images: req.images || [],
        refundMethod: req.refundMethod || "Wallet",
        customerEmail: req.customer?.email || "Unknown Email",
        customerPhone: req.customer?.phone || req.order?.customerPhone || "Unknown Phone",
        bankDetails,
        productCustody: req.productCustody || "With Customer",
        pickupStatus: req.pickupStatus || "Pending",
        qcStatus: req.qcStatus || "Pending",
        qcNotes: req.qcNotes || "",
        riderImages: req.riderImages || [],
        customerOtpVerified: req.customerOtpVerified || false,
        sellerOtpVerified: req.sellerOtpVerified || false,
        deliveryBoyName: req.deliveryBoy ? req.deliveryBoy.name : "Not Assigned",
        assignedAt: req.assignedAt,
        returnPickupFee: req.returnPickupFee || defaultPickupFee,
        riderPayoutProcessed: req.riderPayoutProcessed || false,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Return requests fetched successfully",
      data: transformedRequests,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get return request by ID
 */
export const getReturnRequestById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const returnRequest = await Return.findById(id)
      .populate("order")
      .populate("customer", "name email phone bankDetails")
      .populate({
        path: "orderItem",
        populate: [
          { path: "product", select: "productName mainImage" },
          { path: "seller", select: "sellerName storeName" },
        ],
      })
      .populate("processedBy", "firstName lastName");

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    const retObj = returnRequest.toObject({ getters: true });
    const customer = retObj.customer as any;
    if (customer?.bankDetails) {
      customer.bankDetails = {
        accountName: decrypt(customer.bankDetails.accountName || ""),
        accountNumber: decrypt(customer.bankDetails.accountNumber || ""),
        bankName: decrypt(customer.bankDetails.bankName || ""),
        ifscCode: decrypt(customer.bankDetails.ifscCode || ""),
        upiId: decrypt(customer.bankDetails.upiId || ""),
      };
    }

    return res.status(200).json({
      success: true,
      message: "Return request details fetched successfully",
      data: retObj,
    });
  }
);

/**
 * Process return request (Update)
 */
export const processReturnRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectionReason, refundAmount, adminNotes, refundReference } = req.body;

    const validStatuses = ["Approved", "Rejected", "Processing", "Completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    const updateData: any = {
      processedBy: req.user?.userId,
      processedAt: new Date(),
    };

    if (status) updateData.status = status;

    // Handle rejection reason (frontend sends 'adminNotes' for rejection reason)
    if (status === "Rejected") {
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      else if (adminNotes) updateData.rejectionReason = adminNotes;
    }

    if (status === "Approved" && refundAmount) {
      updateData.refundAmount = refundAmount;
    }

    if (status === "Completed") {
      updateData.refundStatus = "Refunded";
      updateData.refundedAt = new Date();
      if (refundReference) updateData.refundReference = refundReference;
    }

    const updatedReturn = await Return.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("order")
      .populate("orderItem")
      .populate("customer", "name email phone");

    if (status === "Approved" || status === "Completed") {
      await OrderItem.findByIdAndUpdate(returnRequest.orderItem, { status: "Returned" });

      if (status === "Approved") {
        try {
          const io: SocketIOServer = req.app.get("io");
          if (io) {
            notifyDeliveryBoysOfReturnPickup(io, updatedReturn);
          }
        } catch (ioErr) {
          console.error("Error triggering return pickup broadcast:", ioErr);
        }
      }

      // Perform transactional wallet reversal and user refund when return is Completed
      if (status === "Completed") {
        const commission = await Commission.findOne({ orderItem: returnRequest.orderItem, type: "SELLER" });
        if (commission && commission.releaseStatus !== "Reversed") {
          const dbSession = await mongoose.startSession();
          dbSession.startTransaction();

          try {
            if (!commission.seller) {
              throw new Error("Commission has no associated seller");
            }
            const sellerId = commission.seller.toString();
            const netEarning = Math.round((commission.orderAmount - commission.commissionAmount) * 100) / 100;

            console.log(`[processReturnRequest] Reversing Commission ${commission._id} of ₹${netEarning} for Seller ${sellerId}. Release status: ${commission.releaseStatus}`);

            const isLocked = commission.releaseStatus === "Locked";

            // Debit the seller's wallet with the correct parameters (using our updated debitWallet which supports locked balances!)
            await debitWallet(
              sellerId,
              "SELLER",
              netEarning,
              `Reversal for returned order item ${returnRequest.orderItem} in Order ${returnRequest.order}`,
              returnRequest.order.toString(),
              dbSession,
              isLocked,
              true,
              "Return",
              commission._id.toString()
            );

            // Set commission status to Reversed
            commission.releaseStatus = "Reversed";
            await commission.save({ session: dbSession });

            // If customer refund method is Wallet, credit customer's wallet using the dedicated service
            const refundMethod = returnRequest.refundMethod || "Wallet";
            if (refundMethod === "Wallet") {
              const customerId = returnRequest.customer.toString();
              const finalRefundAmount = refundAmount || commission.orderAmount;

              await processCustomerWalletTransaction(
                customerId,
                finalRefundAmount,
                "credit",
                `Refund for returned item in Order #${returnRequest.order}`,
                dbSession
              );
              console.log(`[processReturnRequest] Refunded ₹${finalRefundAmount} to Customer ${customerId}'s wallet.`);
            }

            await dbSession.commitTransaction();
            console.log(`[processReturnRequest] Reversal and refund completed successfully for Return ${id}`);
          } catch (err) {
            await dbSession.abortTransaction();
            console.error(`[processReturnRequest] Error during transactional wallet reversal/refund:`, err);
            throw err;
          } finally {
            dbSession.endSession();
          }
        }
      }
    } else if (status === "Rejected") {
      await OrderItem.findByIdAndUpdate(returnRequest.orderItem, { status: "Delivered" });
    }

    if ((status === "Completed" || status === "Rejected") && updatedReturn?.deliveryBoy && !updatedReturn.riderPayoutProcessed) {
      try {
        const settings = await AppSettings.getSettings();
        const pickupFee = settings.returnPickupFee || 20;
        const commission = await Commission.findOne({ orderItem: returnRequest.orderItem, type: "SELLER" });
        if (commission && commission.seller) {
          const sellerIdStr = commission.seller.toString();
          const deliveryBoyIdStr = updatedReturn.deliveryBoy.toString();

          // Debit Seller
          await debitWallet(
            sellerIdStr,
            "SELLER",
            pickupFee,
            `Return Pickup Fee for Order #${(updatedReturn.order as any)?.orderNumber || updatedReturn.order}`,
            (updatedReturn.order as any)?._id?.toString() || updatedReturn.order.toString(),
            undefined,
            false,
            true,
            "Return",
            updatedReturn._id.toString()
          );

          // Credit Rider
          await creditWallet(
            deliveryBoyIdStr,
            "DELIVERY_BOY",
            pickupFee,
            `Return Pickup Payout for Order #${(updatedReturn.order as any)?.orderNumber || updatedReturn.order}`,
            (updatedReturn.order as any)?._id?.toString() || updatedReturn.order.toString(),
            undefined,
            undefined,
            false,
            false,
            undefined,
            "Return",
            updatedReturn._id.toString()
          );

          updatedReturn.returnPickupFee = pickupFee;
          updatedReturn.riderPayoutProcessed = true;
          await updatedReturn.save();
          console.log(`[processReturnRequest] Processed Return Pickup Fee of ₹${pickupFee} (Debited Seller ${sellerIdStr}, Credited Rider ${deliveryBoyIdStr})`);
        }
      } catch (feeErr) {
        console.error("[processReturnRequest] Error processing return pickup fee:", feeErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Return request ${status ? status.toLowerCase() : "updated"
        } successfully`,
      data: updatedReturn,
    });
  }
);

/**
 * Export orders to CSV
 */
export const exportOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, dateFrom, dateTo } = req.query;

    const query: any = { isParent: { $ne: true } };
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.orderDate.$lte = new Date(dateTo as string);
    }

    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("deliveryBoy", "name mobile")
      .sort({ orderDate: -1 })
      .lean();

    // Convert to CSV format
    const csvHeaders = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Order Date",
      "Status",
      "Payment Status",
      "Total Amount",
      "Delivery Address",
      "Delivery Boy",
    ];

    const csvRows = orders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.orderDate.toISOString(),
      order.status,
      order.paymentStatus,
      order.total.toString(),
      `${order.deliveryAddress.address}, ${order.deliveryAddress.city} - ${order.deliveryAddress.pincode}`,
      order.deliveryBoy ? (order.deliveryBoy as any).name : "Not Assigned",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders_${Date.now()}.csv`
    );
    res.send(csvContent);
  }
);

/**
 * Assign delivery boy to a return request manually
 */
export const assignDeliveryBoyToReturn = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required",
      });
    }

    const deliveryBoy = await Delivery.findById(deliveryBoyId);
    if (!deliveryBoy || deliveryBoy.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy not found or not active",
      });
    }

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    returnRequest.deliveryBoy = deliveryBoyId as any;
    returnRequest.pickupStatus = "Assigned";
    returnRequest.assignedAt = new Date();
    await returnRequest.save();

    return res.status(200).json({
      success: true,
      message: "Delivery boy assigned to return request successfully",
      data: returnRequest,
    });
  }
);

/**
 * Reassign delivery boy to a return request
 */
export const reassignDeliveryBoyToReturn = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "New delivery boy ID is required",
      });
    }

    const deliveryBoy = await Delivery.findById(deliveryBoyId);
    if (!deliveryBoy || deliveryBoy.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy not found or not active",
      });
    }

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    // Constraint: Reassignment is only allowed BEFORE the rider collects the item from the customer.
    if (returnRequest.pickupStatus === "Picked Up" || returnRequest.pickupStatus === "Returned to Seller" || returnRequest.pickupStatus === "QC Failed") {
      return res.status(400).json({
        success: false,
        message: "Cannot reassign rider after the item has been collected from the customer",
      });
    }

    returnRequest.deliveryBoy = deliveryBoyId as any;
    returnRequest.pickupStatus = "Assigned";
    returnRequest.assignedAt = new Date();
    await returnRequest.save();

    return res.status(200).json({
      success: true,
      message: "Rider reassigned successfully. Previous rider will not be paid for this return.",
      data: returnRequest,
    });
  }
);

/**
 * Re-broadcast return pickup to nearby delivery boys
 */
export const rebroadcastReturnPickup = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    if (returnRequest.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved return requests can be broadcasted",
      });
    }

    returnRequest.pickupStatus = "Pending";
    returnRequest.deliveryBoy = undefined;
    await returnRequest.save();

    const io: SocketIOServer = req.app.get("io");
    if (io) {
      notifyDeliveryBoysOfReturnPickup(io, returnRequest);
    }

    return res.status(200).json({
      success: true,
      message: "Return pickup re-broadcasted successfully",
      data: returnRequest,
    });
  }
);

/**
 * Process manual refund for an order
 */
export const processRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { refundReference, refundNotes } = req.body;

    if (!refundReference) {
      return res.status(400).json({
        success: false,
        message: "Refund reference is required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.adminRefundStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Refund cannot be processed. Current refund status: ${order.adminRefundStatus}`,
      });
    }

    order.adminRefundStatus = "Refunded";
    order.paymentStatus = "Refunded";
    order.adminRefundReference = refundReference;
    order.adminRefundNotes = refundNotes || "";
    order.adminRefundedAt = new Date();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order refund processed successfully",
      data: order,
    });
  }
);
