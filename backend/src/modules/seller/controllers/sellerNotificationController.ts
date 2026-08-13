import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Notification from "../../../models/Notification";

/**
 * Get Notifications
 * Fetches notifications for the logged-in seller
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user?.userId;

    const notifications = await Notification.find({
        recipientType: { $in: ["Seller", "All"] },
        $or: [
            { recipientId: sellerId },
            { recipientId: null } // Broadcasts to all sellers
        ]
    })
        .sort({ createdAt: -1 })
        .limit(50); // Limit to last 50 notifications

    return res.status(200).json({
        success: true,
        data: notifications
    });
});

/**
 * Mark Notification as Read
 */
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const sellerId = req.user?.userId;

    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientType: { $in: ["Seller", "All"] }, recipientId: { $in: [sellerId, null] } },
        { isRead: true, readAt: new Date() },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: "Notification not found or access denied"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification
    });
});

/**
 * Mark Multiple Notifications as Read
 */
export const markMultipleAsRead = asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user?.userId;
    const { notificationIds } = req.body;

    let filter: any = {
        recipientType: { $in: ["Seller", "All"] },
        recipientId: { $in: [sellerId, null] },
        isRead: false
    };

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        filter._id = { $in: notificationIds };
    }

    const result = await Notification.updateMany(
        filter,
        { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        modified: result.modifiedCount
    });
});
