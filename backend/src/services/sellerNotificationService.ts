import { Server as SocketIOServer } from "socket.io";
import OrderItem from "../models/OrderItem";
import mongoose from "mongoose";
import Notification from "../models/Notification";
import { sendPushNotification } from "./firebaseAdmin";
import Seller from "../models/Seller";

/**
 * Notify all sellers involved in an order about a new order or status change
 */
export async function notifySellersOfOrderUpdate(
  io: SocketIOServer,
  order: any,
  type: "NEW_ORDER" | "STATUS_UPDATE" | "ORDER_CANCELLED",
): Promise<void> {
  try {
    if (!io) {
      console.error(
        "Socket.io server not provided to notifySellersOfOrderUpdate",
      );
      return;
    }

    // Get all unique seller IDs from order items
    // If items are populated, we can get them directly, otherwise we need to query
    let orderItems = order.items || [];

    // If items are just IDs or if we want to be safe, fetch the full OrderItem details to get seller IDs
    // This is crucial because capturePayment might pass a non-populated order.
    if (
      orderItems.length > 0 &&
      (typeof orderItems[0] === "string" ||
        orderItems[0] instanceof mongoose.Types.ObjectId ||
        !orderItems[0].seller)
    ) {
      orderItems = await (OrderItem as mongoose.Model<any>)
        .find({ order: order._id })
        .populate("seller");
    }

    // Helper to get ID string regardless of whether it's populated or an ObjectId
    const getSellerId = (item: any) => {
      const seller = item.seller;
      if (!seller) return null;
      return (seller._id || seller).toString();
    };

    const sellerIdsSet = new Set<string>(
      orderItems.map(getSellerId).filter(Boolean) as string[],
    );
    const sellerIds = Array.from(sellerIdsSet);

    console.log(
      `🔔 Notifying ${sellerIds.length} sellers about ${type} for order ${order.orderNumber}`,
    );
    console.log(`🔍 [DEBUG] Extracted sellerIds:`, sellerIds);

    // Fetch Seller details to get FCM tokens
    const sellers = await Seller.find({ _id: { $in: sellerIds } }).select('_id fcmTokens fcmTokenMobile');
    const sellerMap = new Map(sellers.map(s => [s._id.toString(), s]));

    // Debug: print all active seller rooms
    const activeRooms = Array.from(io.sockets.adapter.rooms.keys()).filter(
      (room) => room.startsWith("seller-"),
    );
    console.log(`🔍 [DEBUG] Active seller rooms right now:`, activeRooms);

    for (const sellerId of sellerIds) {
      const roomName = `seller-${sellerId}`;
      const room = io.sockets.adapter.rooms.get(roomName);

      // Get only items belonging to this seller
      const sellerSpecificItems = orderItems.filter(
        (item: any) => getSellerId(item) === sellerId,
      );

      const notificationData = {
        type,
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          address: order.deliveryAddress,
        },
        items: sellerSpecificItems.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.total,
          variation: item.variation,
        })),
        totalAmount: sellerSpecificItems.reduce(
          (acc: number, item: any) => acc + item.total,
          0,
        ),
        timestamp: new Date(),
      };

      // Save notification to database
      let title = "New Order Received";
      let message = `You have received a new order #${order.orderNumber}`;
      let priority = "High";

      if (type === "STATUS_UPDATE") {
        title = "Order Status Updated";
        message = `Order #${order.orderNumber} status changed to ${order.status}`;
        priority = "Medium";
      } else if (type === "ORDER_CANCELLED") {
        title = "Order Cancelled";
        message = `Order #${order.orderNumber} has been cancelled`;
        priority = "Urgent";
      }

      try {
        await Notification.create({
          recipientType: "Seller",
          recipientId: sellerId,
          title,
          message,
          type: "Order",
          link: `/seller/orders/${order._id}`,
          actionLabel: "View Order",
          priority,
        });
      } catch (dbErr) {
        console.error(
          `Failed to save notification to DB for seller ${sellerId}:`,
          dbErr,
        );
      }

      // Emit to seller-specific room
      io.to(roomName).emit("seller-notification", notificationData);

      if (room && room.size > 0) {
        console.log(
          `✅ SUCCESS: Emitted notification to ${roomName} (${room.size} active connections)`,
        );
      } else {
        console.log(
          `⚠️ WARNING: Room ${roomName} is empty. Seller may not be connected or room name mismatch.`,
        );
      }

      // Send Push Notification (FCM)
      const seller = sellerMap.get(sellerId);
      if (seller) {
        const tokens = [
          ...(seller.fcmTokenMobile || []),
          ...(seller.fcmTokens || []),
        ];

        if (tokens.length > 0) {
          sendPushNotification(tokens, {
            title,
            body: message,
            data: {
              type: type === "NEW_ORDER" ? "new_order" : "order_update",
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              link: `/seller/orders/${order._id}`,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
          }).catch(err => {
            console.error(`Failed to send FCM to seller ${sellerId}:`, err);
          });
          
          console.log(`📱 Sent FCM push notification to seller ${sellerId} (${tokens.length} tokens)`);
        }
      }
    }
  } catch (error) {
    console.error("Error in notifySellersOfOrderUpdate:", error);
  }
}
