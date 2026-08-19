// @ts-nocheck
import { Request, Response } from "express";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import { asyncHandler } from "../../../utils/asyncHandler";
import Seller from "../../../models/Seller";
import { creditWallet } from "../../../services/walletManagementService";
import { notifyDeliveryBoysOfNewOrder } from "../../../services/orderNotificationService";
import { sendOrderStatusNotification } from "../../../services/notificationService";
import { Server as SocketIOServer } from "socket.io";

/**
 * Get seller's orders with filters, sorting, and pagination
 */
export const getOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const {
      dateFrom,
      dateTo,
      status,
      search,
      page = "1",
      limit = "10",
      sortBy = "orderDate",
      sortOrder = "desc",
    } = req.query;

    // Find all order IDs that contain items from this seller
    const orderItems = await OrderItem.find({ seller: sellerId }).distinct("order");

    // Build query - filter by orders containing this seller's items
    const query: any = { _id: { $in: orderItems } };

    // Date range filter
    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) {
        query.orderDate.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        query.orderDate.$lte = new Date(dateTo as string);
      }
    }

    // Status filter
    if (status && status !== 'All Status') {
      // Map frontend status to backend status
      const statusMapping: Record<string, string> = {
        'Pending': 'Pending',
        'Accepted': 'Accepted',
        'On the way': 'On the way',
        'Delivered': 'Delivered',
        'Cancelled': 'Cancelled',
        'Rejected': 'Rejected',
      };
      query.status = statusMapping[status as string] || status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search as string, $options: "i" } },
        { customerName: { $regex: search as string, $options: "i" } },
        { customerPhone: { $regex: search as string, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("deliveryBoy", "name mobile")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get seller's items for these orders to calculate the correct amount
    const orderIds = orders.map(o => o._id);
    const sellerItems = await OrderItem.find({ order: { $in: orderIds }, seller: sellerId });
    const sellerItemsByOrder = sellerItems.reduce((acc, item) => {
      const oId = item.order.toString();
      if (!acc[oId]) acc[oId] = 0;
      acc[oId] += item.total || 0;
      return acc;
    }, {} as Record<string, number>);

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Format response for frontend
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderId: order.orderNumber,
      deliveryDate: order.estimatedDeliveryDate
        ? order.estimatedDeliveryDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : order.orderDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      orderDate: order.orderDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      status: order.status === 'On the way' ? 'On the way' : order.status,
      amount: sellerItemsByOrder[order._id.toString()] || 0,
      customerName: (order.customer as any)?.name || order.customerName || '',
      customerPhone: (order.customer as any)?.phone || order.customerPhone || '',
      deliveryBoyName: (order.deliveryBoy as any)?.name || '',
    }));

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: formattedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

/**
 * Get order by ID with populated order items, customer, and delivery info
 */
export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;

    // First check if this seller has items in this order
    // First check if this seller has items in this order
    const sellerItems = await OrderItem.find({ order: id, seller: sellerId })
      .populate("seller", "storeName")
      .populate("product");

    if (!sellerItems || sellerItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get order with populated data
    const order = await Order.findById(id)
      .populate("customer", "name email phone")
      .populate("deliveryBoy", "name mobile email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get only this seller's order items
    const orderItems = sellerItems;

    // Format order items for frontend
    // Format order items for frontend
    const formattedItems = orderItems.map(item => {
      let variationVal = item.variation && item.variation !== 'undefined' ? item.variation : null;
      let unit = variationVal || 'N/A';
      let variationMatched = false;

      // Try to resolve variation value from product if it exists
      const product = item.product as any;
      if (product && product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
        // 1. Try to match by ID or Value if validation is present
        if (variationVal) {
            const variationById = product.variations.find((v: any) => v._id.toString() === variationVal);
            if (variationById) {
              unit = variationById.value || variationById.title || variationById.pack || variationById.name || variationVal;
              variationMatched = true;
            } else {
                const variationByValue = product.variations.find((v: any) => 
                  v.value === variationVal || v.title === variationVal || v.name === variationVal || v.pack === variationVal
                );
                if (variationByValue) {
                    unit = variationByValue.value || variationByValue.title || variationByValue.pack || variationByValue.name || variationVal;
                    variationMatched = true;
                }
            }
        }

        // 2. Fallback: If not matched yet, try to recover
        if (!variationMatched) {
             const variationByPrice = product.variations.find((v: any) => v.price === item.unitPrice || v.discPrice === item.unitPrice);
             if (variationByPrice) {
                 unit = variationByPrice.value || variationByPrice.title || variationByPrice.pack || variationByPrice.name;
                 variationMatched = true;
             } else if (product.variations.length === 1) {
                 // 3. Last Resort: If there is only one variation, assume it's that one
                 const v = product.variations[0];
                 unit = v.value || v.title || v.pack || v.name;
             }
        }
      } else if (product) {
         // No variations array, use top-level product pack/weight/size, otherwise "1 Pc"
         if (!variationVal) {
             unit = product.pack || product.weight || product.size || '1 Pc';
         }
      }

      return {
        srNo: item._id.toString().slice(-4), // Use last 4 chars of ID as srNo
        product: item.productName || 'Unknown Product',
        soldBy: (item.seller as any)?.storeName || 'N/A',
        unit: unit,
        price: item.basePrice ? item.basePrice : (item.unitPrice || 0),
        tax: item.taxAmount || 0,
        taxPercent: item.taxPercentage || 0,
        taxName: item.taxName,
        basePrice: item.basePrice,
        qty: item.quantity || 0,
        subtotal: item.total || 0,
      };
    });

    // Format order data for frontend
    const orderDetail = {
      id: order._id,
      invoiceNumber: order.invoiceNumber || order.orderNumber || 'N/A',
      orderDate: order.orderDate ? order.orderDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryDate: order.estimatedDeliveryDate ? order.estimatedDeliveryDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      timeSlot: order.timeSlot || 'N/A',
      status: order.status === 'On the way' ? 'Out For Delivery' : order.status,
      customerName: (order.customer as any)?.name || order.customerName || '',
      customerEmail: (order.customer as any)?.email || order.customerEmail || '',
      customerPhone: (order.customer as any)?.phone || order.customerPhone || '',
      deliveryBoyName: (order.deliveryBoy as any)?.name || '',
      deliveryBoyPhone: (order.deliveryBoy as any)?.mobile || '',
      items: formattedItems,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      grandTotal: order.total || 0,
      paymentMethod: order.paymentMethod || 'N/A',
      paymentStatus: order.paymentStatus || 'Pending',
      deliveryAddress: order.deliveryAddress || {},
      // Add pickup OTP info for the seller
      pickupOtp: order.sellerPickups?.find((p: any) => p.seller.toString() === sellerId)?.pickupOtp || null,
      pickupOtpVerified: order.sellerPickups?.find((p: any) => p.seller.toString() === sellerId)?.pickupOtpVerified || false,
    };

    return res.status(200).json({
      success: true,
      message: "Order details fetched successfully",
      data: orderDetail,
    });
  }
);

/**
 * Update order status (seller can update: Accepted, On the way, Delivered, Cancelled)
 */
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;
    const { status } = req.body;

    // Validate allowed status updates for seller
    const allowedStatuses = ['Accepted', 'Out for Delivery', 'Delivered', 'Cancelled', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Seller can only update to: ${allowedStatuses.join(', ')}`,
      });
    }

    // Check if this seller has items in this order
    const sellerItems = await OrderItem.findOne({ order: id, seller: sellerId });

    if (!sellerItems) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you are not authorized to manage this order",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if status is already the same
    if (order.status === status) {
      return res.status(400).json({
        success: false,
        message: `Order is already ${status}`,
      });
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    if ((status === "Cancelled" || status === "Rejected") && previousStatus !== "Cancelled" && previousStatus !== "Rejected") {
      try {
        const { restoreProductStock } = require("../../../services/orderService");
        await restoreProductStock(order._id.toString());
      } catch (err) {
        console.error("Error restoring stock on seller cancellation:", err);
      }
    }

    // Trigger delivery notification if seller accepts the order
    if (status === 'Accepted' && previousStatus !== 'Accepted') {
        try {
            const io: SocketIOServer = (req.app.get("io") as SocketIOServer);
            if (io) {
                // Need to fetch full order with details for the notification service
                // Using lean() to get a plain JS object which is what the service expects mostly,
                // but checking the service implementation, it uses .items mainly for seller location.
                // We should ensure the passed order object has populated items with sellers.
                const fullOrder = await Order.findById(order._id)
                    .populate({
                        path: 'items',
                        populate: { path: 'seller' }
                    })
                    .lean();

                if (fullOrder) {
                     await notifyDeliveryBoysOfNewOrder(io, fullOrder);
                     console.log(`Delivery notification triggered for Accepted order ${order.orderNumber}`);
                }
            }
        } catch (notifyError) {
            console.error('Error notifying delivery boys on seller acceptance:', notifyError);
            // Don't fail the request, just log
        }
    }

    // If order is delivered, credit seller's balance
    if (status === 'Delivered' && previousStatus !== 'Delivered') {
      const seller = await Seller.findById(sellerId);
      if (seller) {
        // Calculate earnings ONLY for items belonging to this seller
        const items = await OrderItem.find({ order: id, seller: sellerId });
        const sellerSubtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        
        if (sellerSubtotal > 0) {
          // Calculate net earning (sale amount - commission)
          const commissionRate = (seller.commission || 0) / 100;
          const commissionAmount = sellerSubtotal * commissionRate;
          const netEarning = sellerSubtotal - commissionAmount;

          if (!isNaN(netEarning)) {
            await creditWallet(
              sellerId,
              'SELLER',
              netEarning,
              `Earnings from Order #${order.orderNumber || order._id}`,
              order._id.toString()
            );
          }
        }
      }
    }

    // Trigger customer notification for order status update
    if (order.customer) {
      try {
        sendOrderStatusNotification(
          order._id.toString(),
          order.customer.toString(),
          status
        ).catch((err) => console.error(`Error notifying customer of seller status update (${status}):`, err));
      } catch (custErr) {
        console.error("Error dispatching customer notification from seller update:", custErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: {
        id: order._id,
        status: order.status,
      },
    });
  }
);
