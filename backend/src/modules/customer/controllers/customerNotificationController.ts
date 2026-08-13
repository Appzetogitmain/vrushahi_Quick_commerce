import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Notification from "../../../models/Notification";

/**
 * Get Notifications
 * Fetches notifications for the logged-in customer
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.user?.userId;

    const notifications = await Notification.find({
        recipientType: { $in: ["Customer", "All"] },
        $or: [
            { recipientId: customerId },
            { recipientId: null } // Broadcasts to all customers
        ]
    })
        .sort({ createdAt: -1 })
        .limit(50);

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
    const customerId = req.user?.userId;

    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientType: { $in: ["Customer", "All"] }, recipientId: { $in: [customerId, null] } },
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
    const customerId = req.user?.userId;
    const { notificationIds } = req.body;

    let filter: any = {
        recipientType: { $in: ["Customer", "All"] },
        recipientId: { $in: [customerId, null] },
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
