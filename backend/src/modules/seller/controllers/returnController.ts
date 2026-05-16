import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Return from "../../../models/Return";
// import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import AppSettings from "../../../models/AppSettings";

import mongoose from "mongoose";
import { decrypt } from "../../../utils/encryptionUtils";
import { notifyDeliveryBoysOfReturnPickup } from "../../../services/returnNotificationService";
import { Server as SocketIOServer } from "socket.io";

export const getReturnRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user?.userId;
    const { status, page = 1, limit = 10, search, dateFrom, dateTo, sortBy, sortOrder } = req.query;

    const settings = await AppSettings.getSettings();
    const defaultPickupFee = settings?.returnPickupFee || 20;

    const query: any = {};
    if (status && status !== 'All Status') {
      query.status = status;
    }

    // 1. Date Range Filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom as string);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (dateTo) {
        const end = new Date(dateTo as string);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    // 2. Search across productName, orderNumber, customer name, reason, description
    if (search && (search as string).trim()) {
      const searchRegex = { $regex: (search as string).trim(), $options: 'i' };

      // Find OrderItems belonging to this seller matching product name
      const matchingItems = await OrderItem.find({
        seller: sellerId,
        productName: searchRegex
      }).select('_id');
      const itemIds = matchingItems.map(item => item._id);

      // Find matching Orders by orderNumber
      const matchingOrders = await mongoose.model('Order').find({
        orderNumber: searchRegex
      }).select('_id');
      const orderIds = matchingOrders.map(o => o._id);

      // Find matching Customers by name
      const matchingCustomers = await mongoose.model('Customer').find({
        name: searchRegex
      }).select('_id');
      const customerIds = matchingCustomers.map(c => c._id);

      // Combine conditions - must be one of these AND belong to the seller's items
      const sellerItems = await OrderItem.find({ seller: sellerId }).select('_id');
      const sellerItemIds = sellerItems.map(item => item._id);

      query.$and = [
        {
          $or: [
            { orderItem: { $in: itemIds } },
            { order: { $in: orderIds } },
            { customer: { $in: customerIds } },
            { reason: searchRegex },
            { description: searchRegex }
          ]
        },
        { orderItem: { $in: sellerItemIds } }
      ];
    } else {
      // Normal query: returns for seller's order items
      const sellerOrderItems = await OrderItem.find({ seller: sellerId }).select('_id');
      const sellerOrderItemIds = sellerOrderItems.map(item => item._id);
      query.orderItem = { $in: sellerOrderItemIds };
    }

    // 3. Sorting (by status or createdAt on Return model)
    const sort: any = {};
    if (sortBy === 'status' || sortBy === 'createdAt' || sortBy === 'date') {
      const field = sortBy === 'date' ? 'createdAt' : sortBy;
      sort[field] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1; // default sort
    }

    const returns = await Return.find(query)
      .populate({
        path: 'orderItem',
        select: 'productName productImage quantity unitPrice total sku variation product',
        populate: {
          path: 'product',
          select: 'productName mainImage variations'
        }
      })
      .populate({
        path: 'order',
        select: 'orderNumber customerName customerEmail customerPhone deliveryAddress paymentMethod createdAt'
      })
      .populate('customer', 'name email mobile bankDetails')
      .populate('deliveryBoy', 'name phone')
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Return.countDocuments(query);

    // Map to frontend friendly format
    const formattedReturns = returns.map(ret => {
      const item = ret.orderItem as any;
      const order = ret.order as any;
      const product = item?.product;
      const custObj = ret.customer && typeof (ret.customer as any).toObject === "function" ? (ret.customer as any).toObject({ getters: true }) : ret.customer;
      const bankDetails = custObj?.bankDetails ? {
        accountName: decrypt(custObj.bankDetails.accountName || ""),
        accountNumber: decrypt(custObj.bankDetails.accountNumber || ""),
        bankName: decrypt(custObj.bankDetails.bankName || ""),
        ifscCode: decrypt(custObj.bankDetails.ifscCode || ""),
        upiId: decrypt(custObj.bankDetails.upiId || ""),
      } : null;

      let productImage = item?.productImage || product?.mainImage || "";
      let variantText = item?.variation || "N/A";

      if (product && product.variations && Array.isArray(product.variations)) {
        const matchingVar = product.variations.find((v: any) => 
          v._id?.toString() === item?.variation || 
          v.id === item?.variation ||
          v.value === item?.variation ||
          v.title === item?.variation
        );
        if (matchingVar) {
          variantText = `${matchingVar.name ? matchingVar.name + ': ' : ''}${matchingVar.value || matchingVar.name || item?.variation}`;
          if (matchingVar.image && matchingVar.image.trim() !== "") {
            productImage = matchingVar.image;
          }
        } else if ((!productImage || productImage.trim() === "") && product.variations.length > 0 && product.variations[0]?.image) {
          productImage = product.variations[0].image;
        }
      }
      if (!productImage) productImage = "https://via.placeholder.com/150?text=No+Image";

      const calculatedTotal = (item?.unitPrice || 0) * ret.quantity;
      return {
        id: ret._id,
        // Existing backend fields
        productName: item?.productName || 'Unknown Product',
        customerName: order?.customerName || 'Unknown Customer',
        orderId: order?.orderNumber || 'Unknown Order',
        amount: calculatedTotal,
        status: ret.status,
        date: ret.createdAt ? new Date(ret.createdAt).toLocaleDateString('en-GB') : 'N/A', // format like "12/06/2025"
        returnReason: ret.reason,
        description: ret.description || '',
        refundMethod: ret.refundMethod || 'UPI',
        images: ret.images || [],
        bankDetails,
        image: productImage,

        // Frontend expectations (SellerReturnRequest.tsx)
        orderItemId: item?._id || 'N/A',
        product: item?.productName || 'Unknown Product',
        variant: variantText,
        price: item?.unitPrice || 0,
        discPrice: item?.unitPrice || 0, // snapshot discPrice can match price or 0
        quantity: ret.quantity,
        total: calculatedTotal,
        customerPhone: (ret.customer as any)?.mobile || order?.customerPhone || 'N/A',

        productCustody: ret.productCustody || "With Customer",
        pickupStatus: ret.pickupStatus || "Pending",
        qcStatus: ret.qcStatus || "Pending",
        qcNotes: ret.qcNotes || "",
        riderImages: ret.riderImages || [],
        customerOtpVerified: ret.customerOtpVerified || false,
        sellerOtpVerified: ret.sellerOtpVerified || false,
        deliveryBoyName: ret.deliveryBoy ? ((ret.deliveryBoy as any).name === "undefined undefined" || !(ret.deliveryBoy as any).name ? "Not Assigned" : (ret.deliveryBoy as any).name) : "Not Assigned",
        assignedAt: ret.assignedAt,
        returnPickupFee: ret.returnPickupFee || defaultPickupFee,
        riderPayoutProcessed: ret.riderPayoutProcessed || false,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedReturns,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  }
);

export const getReturnRequestById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const settings = await AppSettings.getSettings();
    const defaultPickupFee = settings?.returnPickupFee || 20;

    const returnRequest = await Return.findById(id)
      .populate({
        path: 'orderItem',
        select: 'productName productImage quantity unitPrice total sku variation product',
        populate: {
          path: 'product',
          select: 'productName mainImage variations'
        }
      })
      .populate({
        path: 'order',
        select: 'orderNumber customerName deliveryAddress paymentMethod'
      })
      .populate('customer', 'name email mobile bankDetails')
      .populate('deliveryBoy', 'name phone');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found"
      });
    }

    const item = returnRequest.orderItem as any;
    const order = returnRequest.order as any;
    const product = item?.product;
    const custObj = returnRequest.customer && typeof (returnRequest.customer as any).toObject === "function" ? (returnRequest.customer as any).toObject({ getters: true }) : returnRequest.customer;
    const bankDetails = custObj?.bankDetails ? {
      accountName: decrypt(custObj.bankDetails.accountName || ""),
      accountNumber: decrypt(custObj.bankDetails.accountNumber || ""),
      bankName: decrypt(custObj.bankDetails.bankName || ""),
      ifscCode: decrypt(custObj.bankDetails.ifscCode || ""),
      upiId: decrypt(custObj.bankDetails.upiId || ""),
    } : null;

    let productImage = item?.productImage || product?.mainImage || "";
    if (product && product.variations && Array.isArray(product.variations)) {
      const matchingVar = product.variations.find((v: any) => v._id?.toString() === item?.variation || v.id === item?.variation);
      if (matchingVar && matchingVar.image && matchingVar.image.trim() !== "") {
        productImage = matchingVar.image;
      }
    }

    const formattedDetail = {
      id: returnRequest._id,
      orderId: order?.orderNumber,
      orderDate: order?.createdAt, // Or orderDate if available
      status: returnRequest.status,
      customerName: order?.customerName,
      customerEmail: (returnRequest.customer as any)?.email,
      customerPhone: (returnRequest.customer as any)?.mobile,
      shippingAddress: order?.deliveryAddress ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city}, ${order.deliveryAddress.pincode}` : 'N/A',
      paymentMethod: order?.paymentMethod,
      items: [
        {
          id: item?._id,
          name: item?.productName,
          sku: item?.sku || 'N/A',
          price: item?.unitPrice || 0,
          quantity: returnRequest.quantity, // Return quantity might differ from order item quantity? Using return quantity.
          total: (item?.unitPrice || 0) * returnRequest.quantity,
          image: productImage
        }
      ],
      subtotal: (item?.unitPrice || 0) * returnRequest.quantity,
      tax: 0, // Mock for now
      total: (item?.unitPrice || 0) * returnRequest.quantity,
      reason: returnRequest.reason,
      reasonDescription: returnRequest.description,
      refundMethod: returnRequest.refundMethod,
      images: returnRequest.images,
      bankDetails,
      productCustody: returnRequest.productCustody || "With Customer",
      pickupStatus: returnRequest.pickupStatus || "Pending",
      qcStatus: returnRequest.qcStatus || "Pending",
      qcNotes: returnRequest.qcNotes || "",
      riderImages: returnRequest.riderImages || [],
      customerOtpVerified: returnRequest.customerOtpVerified || false,
      sellerOtpVerified: returnRequest.sellerOtpVerified || false,
      deliveryBoyName: returnRequest.deliveryBoy ? ((returnRequest.deliveryBoy as any).name === "undefined undefined" || !(returnRequest.deliveryBoy as any).name ? "Not Assigned" : (returnRequest.deliveryBoy as any).name) : "Not Assigned",
      assignedAt: returnRequest.assignedAt,
      returnPickupFee: returnRequest.returnPickupFee || defaultPickupFee,
      riderPayoutProcessed: returnRequest.riderPayoutProcessed || false,
    };


    return res.status(200).json({
      success: true,
      data: formattedDetail,
    });
  }
);

export const updateReturnStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updateData: any = { status };
    if (status === "Rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const returnRequest = await Return.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found"
      });
    }

    if (status === "Approved" || status === "Completed") {
      await OrderItem.findByIdAndUpdate(returnRequest.orderItem, { status: "Returned" });
      if (status === "Approved") {
        try {
          const io: SocketIOServer = req.app.get("io");
          if (io) {
            notifyDeliveryBoysOfReturnPickup(io, returnRequest);
          }
        } catch (ioErr) {
          console.error("Error triggering return pickup broadcast:", ioErr);
        }
      }
    } else if (status === "Rejected") {
      await OrderItem.findByIdAndUpdate(returnRequest.orderItem, { status: "Delivered" });
    }

    return res.status(200).json({
      success: true,
      message: "Return status updated successfully",
      data: returnRequest
    });
  }
);
