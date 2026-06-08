import { Server as SocketIOServer } from "socket.io";
import Delivery from "../models/Delivery";
import Order from "../models/Order";
import Seller from "../models/Seller";
import DeliveryTracking from "../models/DeliveryTracking";
import mongoose from "mongoose";
import { notifySellersOfOrderUpdate } from "./sellerNotificationService";
import { sendPushNotification } from "./firebaseAdmin";
import { calculateDeliveryBoyEarning } from "./commissionService";
import AppSettings from "../models/AppSettings";

// Track order notification state
export interface OrderNotificationState {
  orderId: string;
  notifiedDeliveryBoys: Set<string>;
  rejectedDeliveryBoys: Set<string>;
  acceptedBy: string | null;
}

export const notificationStates = new Map<string, OrderNotificationState>();

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find all available delivery boys (online and active)
 */
export async function findAvailableDeliveryBoys(): Promise<
  mongoose.Types.ObjectId[]
> {
  try {
    const now = new Date();
    const deliveryBoys = await Delivery.find({
      isOnline: true,
      status: "Active",
      paymentStatus: { $ne: "Blocked" },
      $or: [
        { policeVerificationForm: { $exists: true, $ne: "" } },
        { policeVerificationDeadline: { $gt: now } },
        { policeVerificationDeadline: { $exists: false } }, // For legacy riders who don't have a deadline yet
      ],
    }).select("_id");

    return deliveryBoys.map((db) => db._id);
  } catch (error) {
    console.error("Error finding available delivery boys:", error);
    return [];
  }
}

/**
 * Find delivery boys near a specific location within a radius
 * Uses the delivery boy's location from the Delivery model (preferred)
 * or falls back to DeliveryTracking
 */
export async function findDeliveryBoysNearLocation(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
): Promise<{ deliveryBoyId: mongoose.Types.ObjectId; distance: number }[]> {
  try {
    // 1. Try to find delivery boys using the new GeoJSON location field in Delivery model
    const nearbyDeliveryBoys: {
      deliveryBoyId: mongoose.Types.ObjectId;
      distance: number;
    }[] = [];

    const now = new Date();
    try {
      const deliveryBoysWithLocation = await Delivery.find({
        isOnline: true,
        status: "Active",
        paymentStatus: { $ne: "Blocked" },
        $or: [
          { policeVerificationForm: { $exists: true, $ne: "" } },
          { policeVerificationDeadline: { $gt: now } },
          { policeVerificationDeadline: { $exists: false } },
        ],
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000, // Convert km to meters
          },
        },
      }).select("_id location");

      if (deliveryBoysWithLocation.length > 0) {
        for (const db of deliveryBoysWithLocation) {
          if (db.location && db.location.coordinates) {
            const [dbLng, dbLat] = db.location.coordinates;
            const distance = calculateDistance(
              latitude,
              longitude,
              dbLat,
              dbLng,
            );
            nearbyDeliveryBoys.push({
              deliveryBoyId: db._id as mongoose.Types.ObjectId,
              distance,
            });
          }
        }

        console.log(
          `📍 Found ${nearbyDeliveryBoys.length} delivery boys using live location within ${radiusKm}km of seller`,
        );
        return nearbyDeliveryBoys.sort((a, b) => a.distance - b.distance);
      }
    } catch (nearErr: any) {
      console.log(
        `⚠️ GeoJSON $near query failed (${nearErr.message || nearErr.codeName}). Falling back to manual distance calculation...`,
      );
    }

    console.log(
      `⚠️ No delivery boys found within ${radiusKm}km using live location. Checking fallback...`,
    );

    // 2. Fallback to the old method using DeliveryTracking if no delivery boys found with the new field
    // Get all active and online delivery boys
    const allDeliveryBoys = await Delivery.find({
      isOnline: true,
      status: "Active",
    }).select("_id");

    if (allDeliveryBoys.length === 0) {
      return [];
    }

    // Get latest locations for these delivery boys from DeliveryTracking
    const deliveryBoyIds = allDeliveryBoys.map((db) => db._id);

    // Get the most recent tracking record for each delivery boy
    const trackingRecords = await DeliveryTracking.aggregate([
      {
        $match: {
          deliveryBoy: { $in: deliveryBoyIds },
          // Check both legacy fields and new currentLocation structure
          $or: [
            {
              "currentLocation.latitude": { $exists: true },
              "currentLocation.longitude": { $exists: true },
            },
            { latitude: { $exists: true }, longitude: { $exists: true } },
          ],
        },
      },
      {
        $sort: { "currentLocation.timestamp": -1, updatedAt: -1 },
      },
      {
        $group: {
          _id: "$deliveryBoy",
          latestLocation: { $first: "$currentLocation" },
          legacyLat: { $first: "$latitude" },
          legacyLng: { $first: "$longitude" },
        },
      },
    ]);

    for (const record of trackingRecords) {
      const deliveryLat = record.latestLocation?.latitude || record.legacyLat;
      const deliveryLng = record.latestLocation?.longitude || record.legacyLng;

      if (deliveryLat && deliveryLng) {
        const distance = calculateDistance(
          latitude,
          longitude,
          deliveryLat,
          deliveryLng,
        );

        if (distance <= radiusKm) {
          nearbyDeliveryBoys.push({
            deliveryBoyId: record._id,
            distance,
          });
        }
      }
    }

    // Also include delivery boys who don't have tracking data yet (they might be new)
    // but give them a default distance
    const trackedIds = new Set(trackingRecords.map((r) => r._id.toString()));
    for (const db of allDeliveryBoys) {
      if (!trackedIds.has(db._id.toString())) {
        // Include untracked delivery boys with a default distance
        nearbyDeliveryBoys.push({
          deliveryBoyId: db._id as mongoose.Types.ObjectId,
          distance: radiusKm / 2, // Default to half the radius
        });
      }
    }

    // Sort by distance (nearest first)
    nearbyDeliveryBoys.sort((a, b) => a.distance - b.distance);

    console.log(
      `📍 Found ${nearbyDeliveryBoys.length} delivery boys (fallback) within ${radiusKm}km`,
    );
    return nearbyDeliveryBoys;
  } catch (error) {
    console.error("Error finding nearby delivery boys:", error);
    return [];
  }
}

/**
 * Find delivery boys near seller locations for an order
 * Aggregates all unique sellers from order items and finds delivery boys within their service radius
 */
export async function findDeliveryBoysNearSellerLocations(
  order: any,
): Promise<mongoose.Types.ObjectId[]> {
  try {
    console.log(
      `🔍 Finding delivery boys for order: ${order.orderNumber || order._id}`,
    );

    // 1. Ensure order is populated with items and sellers
    let populatedOrder = order;
    if (
      !order.items ||
      order.items.length === 0 ||
      typeof order.items[0] === "string" ||
      order.items[0] instanceof mongoose.Types.ObjectId ||
      !order.items[0].seller
    ) {
      try {
        const fullOrder = await (Order as mongoose.Model<any>)
          .findById(order._id)
          .populate({
            path: "items",
            populate: { path: "seller" },
          })
          .lean();
        if (fullOrder) {
          populatedOrder = fullOrder;
          console.log(
            "✅ Order populated successfully for location calculation",
          );
        }
      } catch (popError) {
        console.error(
          "❌ Failed to populate order for delivery notification:",
          popError,
        );
      }
    }

    // 2. Get unique seller IDs from order items
    const sellerIds = Array.from(
      new Set(
        populatedOrder.items
          ?.map((item: any) => {
            const seller = item.seller;
            if (!seller) return null;
            return (seller._id || seller).toString();
          })
          .filter((id: string) => id) || [],
      ),
    );

    if (sellerIds.length === 0) {
      console.log(
        "⚠️ No sellers found in order items, falling back to all available delivery boys",
      );
      return findAvailableDeliveryBoys();
    }

    // 3. Get seller documents for locations
    const sellers = await Seller.find({
      _id: { $in: sellerIds },
    }).select("latitude longitude location serviceRadiusKm storeName");

    if (sellers.length === 0) {
      console.log(
        "⚠️ No seller records found in DB, falling back to all available delivery boys",
      );
      return findAvailableDeliveryBoys();
    }

    const firstItem = populatedOrder.items?.[0];
    const sellerRef = firstItem?.seller;

    // Helper to extract coordinates safely
    const getCoords = (seller: any) => {
      if (seller?.location?.coordinates)
        return {
          lat: seller.location.coordinates[1],
          lng: seller.location.coordinates[0],
        };
      if (seller?.latitude && seller?.longitude)
        return {
          lat: parseFloat(seller.latitude),
          lng: parseFloat(seller.longitude),
        };
      return { lat: 0, lng: 0 };
    };

    const sellerLocation = getCoords(sellerRef);

    console.log(
      `🛵 Notifying delivery boys near Seller (${sellerRef?.storeName || "Unknown"}): ${sellerLocation.lat}, ${sellerLocation.lng}`,
    );

    // Find delivery boys near each seller location
    const nearbyDeliveryBoyMap = new Map<string, { distance: number }>();

    for (const seller of sellers) {
      let lat: number | null = null;
      let lng: number | null = null;

      // Prioritize GeoJSON location field
      if (seller.location && seller.location.coordinates) {
        lng = seller.location.coordinates[0];
        lat = seller.location.coordinates[1];
      } else {
        // Fallback to legacy fields
        lat = seller.latitude ? parseFloat(seller.latitude) : null;
        lng = seller.longitude ? parseFloat(seller.longitude) : null;
      }

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.log(
          `Seller ${seller.storeName} has no valid location, skipping`,
        );
        continue;
      }

      const radius = seller.serviceRadiusKm || 10; // Default 10km
      const nearbyBoys = await findDeliveryBoysNearLocation(lat, lng, radius);

      for (const boy of nearbyBoys) {
        const boyId = boy.deliveryBoyId.toString();
        // Keep the smallest distance if same delivery boy is near multiple sellers
        if (
          !nearbyDeliveryBoyMap.has(boyId) ||
          nearbyDeliveryBoyMap.get(boyId)!.distance > boy.distance
        ) {
          nearbyDeliveryBoyMap.set(boyId, { distance: boy.distance });
        }
      }
    }

    if (nearbyDeliveryBoyMap.size === 0) {
      console.log(
        "No delivery boys found near seller locations, falling back to all available",
      );
      return findAvailableDeliveryBoys();
    }

    // Sort by distance and return IDs
    const sortedBoys = Array.from(nearbyDeliveryBoyMap.entries())
      .sort((a, b) => a[1].distance - b[1].distance)
      .map(([id]) => new mongoose.Types.ObjectId(id));

    console.log(
      `📍 Found ${sortedBoys.length} delivery boys near seller locations. IDs:`,
      sortedBoys,
    );
    return sortedBoys;
  } catch (error) {
    console.error("Error finding delivery boys near seller locations:", error);
    return findAvailableDeliveryBoys();
  }
}

/**
 * Emit new order notification to delivery boys near seller locations
 * Prioritizes delivery boys within the seller's service radius
 */
export async function notifyDeliveryBoysOfNewOrder(
  io: SocketIOServer,
  order: any,
): Promise<void> {
  try {
    console.log(
      `🔔 PREPARING NOTIFICATION for order: ${order.orderNumber || order._id}`,
    );

    // 1. Ensure order is populated for detailed notification data
    let populatedOrder = order;
    if (
      !order.items ||
      order.items.length === 0 ||
      typeof order.items[0] === "string" ||
      order.items[0] instanceof mongoose.Types.ObjectId ||
      !order.items[0].seller
    ) {
      try {
        const fullOrder = await (Order as mongoose.Model<any>)
          .findById(order._id)
          .populate({
            path: "items",
            populate: { path: "seller" },
          })
          .lean();
        if (fullOrder) {
          populatedOrder = fullOrder;
        }
      } catch (popError) {
        console.error(
          "❌ Failed to populate order for notification data:",
          popError,
        );
      }
    }

    // Find delivery boys near seller locations (within service radius)
    let nearbyDeliveryBoyIds =
      await findDeliveryBoysNearSellerLocations(populatedOrder);

    console.log(
      `🔍 [DEBUG] nearbyDeliveryBoyIds before filtering:`,
      nearbyDeliveryBoyIds,
    );

    if (nearbyDeliveryBoyIds.length === 0) {
      console.log("No available delivery boys to notify (including fallback)");
      return;
    }

    // --- FILTER BUSY DELIVERY BOYS ---
    // Get max concurrent orders limit from AppSettings
    const appSettings = await AppSettings.findOne();
    const maxConcurrentOrders = appSettings?.riderMaxConcurrentOrders || 1;

    // Find which delivery boys have reached or exceeded maxConcurrentOrders
    const busyAgg = await Order.aggregate([
      {
        $match: {
          deliveryBoy: { $in: nearbyDeliveryBoyIds },
          deliveryBoyStatus: { $in: ["Assigned", "Picked Up", "In Transit"] },
          status: { $nin: ["Delivered", "Cancelled", "Rejected", "Returned"] },
        },
      },
      {
        $group: {
          _id: "$deliveryBoy",
          activeCount: { $sum: 1 },
        },
      },
      {
        $match: {
          activeCount: { $gte: maxConcurrentOrders },
        },
      },
    ]);

    if (busyAgg.length > 0) {
      const busyIdsSet = new Set(busyAgg.map((b) => b._id.toString()));

      const originalCount = nearbyDeliveryBoyIds.length;
      nearbyDeliveryBoyIds = nearbyDeliveryBoyIds.filter(
        (id) => !busyIdsSet.has(id.toString()),
      );

      console.log(
        `ℹ️ Filtered out ${originalCount - nearbyDeliveryBoyIds.length} busy delivery boys (>= ${maxConcurrentOrders} orders). Active: ${nearbyDeliveryBoyIds.length}`,
      );

      if (nearbyDeliveryBoyIds.length === 0) {
        console.log(
          "⚠️ All nearby delivery boys are currently busy at max capacity.",
        );
        // Optionally: could emit to admin or retry later
        return;
      }
    }
    // ---------------------------------

    // Prepare order data for notification
    const orderData = {
      orderId: populatedOrder._id.toString(),
      orderNumber: populatedOrder.orderNumber,
      customerName: populatedOrder.customerName,
      customerPhone: populatedOrder.customerPhone,
      deliveryAddress: {
        address: populatedOrder.deliveryAddress.address,
        city: populatedOrder.deliveryAddress.city,
        state: populatedOrder.deliveryAddress.state,
        pincode: populatedOrder.deliveryAddress.pincode,
      },
      items: populatedOrder.items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        variation: item.variation,
      })),
      total: populatedOrder.total,
      subtotal: populatedOrder.subtotal,
      shipping: populatedOrder.shipping,
      createdAt: populatedOrder.createdAt,
    };

    // Fetch delivery boy documents to get FCM tokens
    const deliveryBoys = await Delivery.find({
      _id: { $in: nearbyDeliveryBoyIds },
    }).select("_id fcmTokens fcmTokenMobile name");

    const deliveryBoyMap = new Map(
      deliveryBoys.map((db) => [db._id.toString(), db]),
    );

    // Initialize notification state
    const orderId = order._id.toString();
    const notifiedIds = new Set<string>();

    // Notify delivery boys
    for (const id of nearbyDeliveryBoyIds) {
      const idString = id.toString().trim();
      const roomName = `delivery-${idString}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      const deliveryBoy = deliveryBoyMap.get(idString);

      // Calculate earning for this specific delivery boy
      const earningInfo = await calculateDeliveryBoyEarning(populatedOrder);
      const personalizedOrderData = {
        ...orderData,
        expectedEarning: earningInfo.amount,
      };

      if (room && room.size > 0) {
        // Connected: Send socket notification
        notifiedIds.add(idString);
        io.to(roomName).emit("new-order", personalizedOrderData);
        console.log(
          `✅ SUCCESS: Emitted new-order to room: ${roomName} (Active users: ${room.size})`,
        );
      } else {
        console.log(
          `ℹ️ Room ${roomName} is empty or does not exist. (Checked: ${!!room})`,
        );
        const allDeliveryRooms = Array.from(
          io.sockets.adapter.rooms.keys(),
        ).filter((r) => r.startsWith("delivery-"));
        console.log(
          `🔍 [DEBUG] Active delivery rooms right now:`,
          allDeliveryRooms,
        );

        if (deliveryBoy) {
          // Disconnected: Fallback to FCM Push Notification
          const tokens = [
            ...(deliveryBoy.fcmTokenMobile || []),
            ...(deliveryBoy.fcmTokens || []),
          ];

          if (tokens.length > 0) {
            notifiedIds.add(idString);
            // Send FCM in background
            sendPushNotification(tokens, {
              title: "New Order Available! 📦",
              body: `Order #${order.orderNumber} is available. You will earn ₹${earningInfo.amount}.`,
              data: {
                type: "new_order",
                orderId: orderId,
                orderNumber: order.orderNumber,
                expectedEarning: earningInfo.amount.toString(),
                link: `/delivery/orders/${orderId}`,
                click_action: "FLUTTER_NOTIFICATION_CLICK",
              },
            }).catch((err) =>
              console.error(
                `Failed to send FCM to delivery boy ${idString}:`,
                err,
              ),
            );

            console.log(
              `📱 Sent FCM fallback to disconnected delivery boy: ${deliveryBoy.name} (${idString}) (Earning: ${earningInfo.amount})`,
            );
          }
        }
      }
    }

    if (notifiedIds.size === 0) {
      console.log("⚠️ No connected delivery boys found to notify");
      // Don't emit to general room as it includes offline delivery boys
      return;
    }

    notificationStates.set(orderId, {
      orderId,
      notifiedDeliveryBoys: notifiedIds,
      rejectedDeliveryBoys: new Set(),
      acceptedBy: null,
    });

    // Only notify individual active delivery boys, not the general room
    // This prevents offline delivery boys from receiving notifications

    console.log(
      `📢 Notified ${notifiedIds.size} connected delivery boys near seller locations about order ${order.orderNumber}`,
    );
  } catch (error) {
    console.error("Error notifying delivery boys:", error);
  }
}

/**
 * Handle order acceptance by a delivery boy
 */
export async function handleOrderAcceptance(
  io: SocketIOServer,
  orderId: string,
  deliveryBoyId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const state = notificationStates.get(orderId);
    const normalizedDeliveryBoyId = String(deliveryBoyId).trim();

    // 1. In-Memory Check (Preferred)
    if (state) {
      // Check if already accepted in memory
      if (state.acceptedBy) {
        return {
          success: false,
          message: "Order already accepted by another delivery boy",
        };
      }

      // Check if this delivery boy was notified
      if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
        console.warn(
          `⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for acceptance of order ${orderId}. Notified:`,
          Array.from(state.notifiedDeliveryBoys),
        );
        return {
          success: false,
          message: "You were not notified about this order",
        };
      }

      // Check if this delivery boy already rejected
      if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
        return {
          success: false,
          message: "You have already rejected this order",
        };
      }

      // Mark as accepted in memory
      state.acceptedBy = normalizedDeliveryBoyId;
    } else {
      console.log(
        `⚠️ Notification state missing for order ${orderId}. Checking database for fallback...`,
      );
      // 2. Database Fallback (For server restarts/stale notifications)
      // We skip "notified" and "rejected" checks because that data is lost.
      // We assume if they have the ID, they were notified effectively.
    }

    // Update order in database
    const order = await (Order as mongoose.Model<any>).findById(orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Check if order already has a delivery boy assigned
    if (order.deliveryBoy) {
      return {
        success: false,
        message: "Order already assigned to another delivery boy",
      };
    }

    // Assign order to delivery boy
    order.deliveryBoy = new mongoose.Types.ObjectId(normalizedDeliveryBoyId);
    order.deliveryBoyStatus = "Assigned";
    order.assignedAt = new Date();
    order.status = "Processed"; // Mark as processed when assigned

    await order.save();

    // Emit order-accepted event to all delivery boys who were notified
    // (Only to individual rooms, not general room)
    if (state) {
      for (const notifiedId of Array.from(state.notifiedDeliveryBoys)) {
        const notifiedIdString = String(notifiedId).trim();
        io.to(`delivery-${notifiedIdString}`).emit("order-accepted", {
          orderId,
          acceptedBy: normalizedDeliveryBoyId,
        });
      }
      // Clean up notification state
      notificationStates.delete(orderId);
    } else {
      // If no state, emit to the accepting delivery boy
      io.to(`delivery-${normalizedDeliveryBoyId}`).emit("order-accepted", {
        orderId,
        acceptedBy: normalizedDeliveryBoyId,
      });
    }

    // Emit delivery-boy-accepted event to customer for tracking
    io.to(`order-${orderId}`).emit("delivery-boy-accepted", {
      orderId,
      deliveryBoyId: normalizedDeliveryBoyId,
      message: "Delivery boy accepted your order. Tracking started.",
    });

    // Notify sellers involved in this order that a rider has been assigned
    try {
      const fullOrderWithItems = await (Order as mongoose.Model<any>)
        .findById(orderId)
        .populate({
          path: "items",
          populate: { path: "seller" },
        })
        .lean();
      if (fullOrderWithItems) {
        await notifySellersOfOrderUpdate(
          io,
          fullOrderWithItems,
          "STATUS_UPDATE",
        );
        console.log(
          `📢 Notified sellers about rider assignment for order ${orderId}`,
        );
      }
    } catch (sellerNotifyError) {
      console.error(
        "Error notifying sellers about rider assignment:",
        sellerNotifyError,
      );
    }

    console.log(
      `✅ Order ${orderId} accepted by delivery boy ${normalizedDeliveryBoyId} ${state ? "(Memory)" : "(DB Fallback)"}`,
    );
    return { success: true, message: "Order accepted successfully" };
  } catch (error) {
    console.error("Error handling order acceptance:", error);
    return { success: false, message: "Error accepting order" };
  }
}

/**
 * Handle order rejection by a delivery boy
 */
export async function handleOrderRejection(
  io: SocketIOServer,
  orderId: string,
  deliveryBoyId: string,
): Promise<{ success: boolean; message: string; allRejected: boolean }> {
  try {
    const state = notificationStates.get(orderId);

    if (!state) {
      // In-memory state was lost (PM2 restart / server redeploy).
      // Allow the delivery boy to dismiss the stale popup gracefully.
      console.warn(
        `⚠️ No notification state for order ${orderId} (likely PM2 restart). Allowing graceful dismiss.`,
      );
      return {
        success: true,
        message: "Order notification cleared",
        allRejected: false,
      };
    }

    // Check if already accepted
    if (state.acceptedBy) {
      return {
        success: false,
        message: "Order already accepted",
        allRejected: false,
      };
    }

    // Check if this delivery boy was notified
    const normalizedDeliveryBoyId = String(deliveryBoyId).trim();
    if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
      console.warn(
        `⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for order ${orderId}. Notified:`,
        Array.from(state.notifiedDeliveryBoys),
      );
      return {
        success: false,
        message: "You were not notified about this order",
        allRejected: false,
      };
    }

    // Check if already rejected
    if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
      return {
        success: true,
        message: "You have already rejected this order",
        allRejected: false,
      };
    }

    // Mark as rejected
    state.rejectedDeliveryBoys.add(normalizedDeliveryBoyId);

    // Check if all delivery boys have rejected
    const allRejected =
      state.rejectedDeliveryBoys.size === state.notifiedDeliveryBoys.size;

    if (allRejected) {
      // Update order in database to "Rejected"
      try {
        // Update order in database to "Rejected"
        const order = await (Order as mongoose.Model<any>).findById(orderId);
        if (order) {
          order.status = "Rejected";
          order.deliveryBoyStatus = "Failed";
          order.adminNotes =
            (order.adminNotes ? order.adminNotes + "\n" : "") +
            `[${new Date().toISOString()}] Rejected: All notified delivery boys (${state.notifiedDeliveryBoys.size}) rejected the order.`;
          await order.save();

          // Notify customer via socket
          io.to(`order-${orderId}`).emit("order-rejected", {
            orderId,
            message:
              "Unfortunately, no delivery partner is available at the moment. Your order has been rejected.",
          });

          // Notify sellers/restaurants
          notifySellersOfOrderUpdate(io, order, "STATUS_UPDATE");

          console.log(
            `✅ All delivery boys rejected order ${orderId}. Order status updated to Rejected.`,
          );
        } else {
          console.error(
            `❌ Order ${orderId} not found when trying to update rejection status`,
          );
        }
      } catch (dbError) {
        console.error(
          `❌ Error updating order ${orderId} to Rejected status:`,
          dbError,
        );
        // We still proceed with cleanup to avoid memory leaks/stuck state
      }

      // Clean up notification state
      notificationStates.delete(orderId);
    } else {
      // Emit rejection acknowledgment to the specific delivery boy
      io.to(`delivery-${deliveryBoyId}`).emit("order-rejection-acknowledged", {
        orderId,
      });
    }

    console.log(`🚫 Delivery boy ${deliveryBoyId} rejected order ${orderId}`);
    return { success: true, message: "Order rejected", allRejected };
  } catch (error) {
    console.error("Error handling order rejection:", error);
    return {
      success: false,
      message: "Error rejecting order",
      allRejected: false,
    };
  }
}

/**
 * Get notification state for an order
 */
export function getNotificationState(
  orderId: string,
): OrderNotificationState | undefined {
  return notificationStates.get(orderId);
}

/**
 * Clean up notification state (for testing or manual cleanup)
 */
export function clearNotificationState(orderId: string): void {
  notificationStates.delete(orderId);
}
