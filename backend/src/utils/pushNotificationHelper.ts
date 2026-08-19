// @ts-nocheck
import Customer from '../models/Customer';
import Delivery from '../models/Delivery';
import Seller from '../models/Seller';
import Admin from '../models/Admin';
import { sendPushNotification, PushNotificationPayload } from '../services/firebaseAdmin';

/**
 * Send notification to a specific user (Customer, Delivery, Seller, or Admin)
 * @param userId - The ID of the user to send to
 * @param payload - Notification payload
 * @param userType - User type ('Customer' | 'Delivery' | 'Seller' | 'Admin')
 * @param includeMobile - Whether to include mobile tokens (default true)
 */
export async function sendNotificationToUser(
    userId: string,
    payload: PushNotificationPayload,
    userType: 'Customer' | 'Delivery' | 'Seller' | 'Admin' = 'Customer',
    includeMobile: boolean = true
) {
    try {
        let user: any = null;
        const proj = { fcmTokens: 1, fcmTokenMobile: 1, notificationPreferences: 1, settings: 1 };

        if (userType === 'Customer') {
            user = await (Customer as any).findById(userId, proj).lean();
        } else if (userType === 'Delivery') {
            user = await (Delivery as any).findById(userId, proj).lean();
        } else if (userType === 'Seller') {
            user = await (Seller as any).findById(userId, proj).lean();
        } else if (userType === 'Admin') {
            user = await (Admin as any).findById(userId, proj).lean();
        }

        if (!user) {
            console.warn(`[PushNotificationHelper] User not found (${userType}): ${userId}`);
            return { successCount: 0, failureCount: 0 };
        }

        // Check user push notification preference
        const pushEnabled = userType === 'Delivery'
            ? user.settings?.notifications !== false
            : user.notificationPreferences?.push !== false;

        if (!pushEnabled) {
            console.log(`[PushNotificationHelper] Push disabled in preferences for ${userType} ${userId}`);
            return { successCount: 0, failureCount: 0 };
        }

        let tokens: string[] = [];

        // Add Web Tokens
        if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            tokens.push(...user.fcmTokens);
        }

        // Add Mobile Tokens
        if (includeMobile && user.fcmTokenMobile && Array.isArray(user.fcmTokenMobile) && user.fcmTokenMobile.length > 0) {
            tokens.push(...user.fcmTokenMobile);
        }

        // Deduplicate
        const uniqueTokens = [...new Set(tokens)].filter(Boolean);

        if (uniqueTokens.length === 0) {
            console.log(`[PushNotificationHelper] No registered tokens for ${userType} ${userId}`);
            return { successCount: 0, failureCount: 0 };
        }

        console.log(`[PushNotificationHelper] Sending notification to ${userType} ${userId} (${uniqueTokens.length} token(s))`);
        return await sendPushNotification(uniqueTokens, payload);
    } catch (error) {
        console.error(`[PushNotificationHelper] Error sending notification to ${userType} ${userId}:`, error);
        return { successCount: 0, failureCount: 0 };
    }
}
