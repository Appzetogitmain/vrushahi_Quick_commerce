import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Notification from "../../../models/Notification";
import { sendPushNotification } from "../../../services/firebaseAdmin";
import Customer from "../../../models/Customer";
import Delivery from "../../../models/Delivery";
import Seller from "../../../models/Seller";
import Admin from "../../../models/Admin";

/**
 * Collect FCM tokens for a given recipientType
 */
async function collectTokens(recipientType: string, recipientId?: string): Promise<string[]> {
  const tokens: string[] = [];
  const proj = { fcmTokens: 1, fcmTokenMobile: 1, notificationPreferences: 1 };

  const addUserTokens = (user: any) => {
    if (user?.notificationPreferences?.push === false) return;
    if (user?.fcmTokens?.length) tokens.push(...user.fcmTokens);
    if (user?.fcmTokenMobile?.length) tokens.push(...user.fcmTokenMobile);
  };

  if (recipientId) {
    // Specific user — use lean() for plain object, explicit any avoids union-type error
    let user: any;
    if (recipientType === "Customer") user = await (Customer as any).findById(recipientId, proj).lean();
    else if (recipientType === "Delivery") user = await (Delivery as any).findById(recipientId, proj).lean();
    else if (recipientType === "Seller") user = await (Seller as any).findById(recipientId, proj).lean();
    else if (recipientType === "Admin") user = await (Admin as any).findById(recipientId, proj).lean();
    if (user) addUserTokens(user);
  } else {
    // Broadcast — fetch all of the relevant role(s)
    const types = recipientType === "All"
      ? ["Customer", "Delivery", "Seller", "Admin"]
      : [recipientType];

    for (const type of types) {
      let users: any[] = [];
      if (type === "Customer") users = await (Customer as any).find({}, proj).lean();
      else if (type === "Delivery") users = await (Delivery as any).find({}, proj).lean();
      else if (type === "Seller") users = await (Seller as any).find({}, proj).lean();
      else if (type === "Admin") users = await (Admin as any).find({}, proj).lean();
      users.forEach(addUserTokens);
    }
  }

  // Deduplicate
  return [...new Set(tokens)];
}

/**
 * Create a new notification
 */
export const createNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      recipientType,
      recipientId,
      title,
      message,
      type,
      link,
      actionLabel,
      priority,
      expiresAt,
    } = req.body;

    if (!recipientType || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient type, title, and message are required",
      });
    }

    const notification = await Notification.create({
      recipientType,
      recipientId,
      title,
      message,
      type: type || "Info",
      link,
      actionLabel,
      priority: priority || "Medium",
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user?.userId,
      isRead: false,
    });

    // Send push notification asynchronously (non-blocking)
    collectTokens(recipientType, recipientId).then(async (tokens) => {
      if (tokens.length === 0) {
        console.log(`[FCM Broadcast] No tokens found for recipientType=${recipientType}. Skipping push.`);
        return;
      }
      console.log(`[FCM Broadcast] Sending push to ${tokens.length} token(s) for recipientType=${recipientType}`);
      try {
        const result = await sendPushNotification(tokens, {
          title,
          body: message,
          data: {
            type: type || "Info",
            notificationId: notification._id.toString(),
            link: link || "",
          },
        });
        console.log(`[FCM Broadcast] Done — success: ${result.successCount}, failed: ${result.failureCount}`);
        // Mark as sent
        await Notification.findByIdAndUpdate(notification._id, { sentAt: new Date() });
      } catch (pushErr) {
        console.error("[FCM Broadcast] Error sending push:", pushErr);
      }
    }).catch((err) => console.error("[FCM Broadcast] collectTokens error:", err));

    return res.status(201).json({
      success: true,
      message: "Notification created and push dispatched",
      data: notification,
    });
  }
);


/**
 * Get all notifications
 */
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      recipientType,
      recipientId,
      isRead,
      type,
      priority,
    } = req.query;

    const query: any = {};

    if (recipientType) query.recipientType = recipientType;
    
    if (recipientId) {
      query.recipientId = recipientId;
    } else if (req.user && req.user.userType === "Admin" && (!recipientType || recipientType === "Admin")) {
      // Only fetch notifications addressed to this specific admin to avoid seeing duplicates
      query.recipientId = req.user.userId;
    }

    if (isRead !== undefined) query.isRead = isRead === "true";
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Filter expired notifications
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } },
    ];

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("createdBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
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
 * Get notification by ID
 */
export const getNotificationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findById(id).populate(
      "createdBy",
      "firstName lastName"
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification fetched successfully",
      data: notification,
    });
  }
);

/**
 * Mark notification as read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    {
      isRead: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

/**
 * Update notification
 */
export const updateNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const notification = await Notification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification,
    });
  }
);

/**
 * Send notification (Push to users)
 * This is a placeholder for actual push notification logic (Firebase/Socket.io)
 * For now, just mark it as sent.
 */
export const sendNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Logic to send push notification would go here
    // e.g. await pushNotificationService.send(notification);

    notification.sentAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  }
);

/**
 * Mark multiple notifications as read
 */
export const markMultipleAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs array is required",
      });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modified: result.modifiedCount,
      },
    });
  }
);

/**
 * Delete notification
 */
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  }
);
