import { Server as SocketIOServer } from 'socket.io';
import Return from '../models/Return';
import Order from '../models/Order';
import AppSettings from '../models/AppSettings';
import Delivery from '../models/Delivery';
import mongoose from 'mongoose';
import { findDeliveryBoysNearLocation } from './orderNotificationService';
import { sendPushNotification } from './firebaseAdmin';

export interface ReturnNotificationState {
    returnId: string;
    notifiedDeliveryBoys: Set<string>;
    rejectedDeliveryBoys: Set<string>;
    acceptedBy: string | null;
}

export const returnNotificationStates = new Map<string, ReturnNotificationState>();

/**
 * Broadcast return pickup request to nearby delivery boys
 */
export async function notifyDeliveryBoysOfReturnPickup(
    io: SocketIOServer,
    returnRequest: any
): Promise<void> {
    try {
        console.log(`🔔 PREPARING RETURN PICKUP NOTIFICATION for Return: ${returnRequest._id}`);

        // 1. Populate required fields if not already populated
        let populatedReturn = returnRequest;
        if (!returnRequest.order || typeof returnRequest.order === 'string' || !returnRequest.order.deliveryAddress) {
            const fullReturn = await Return.findById(returnRequest._id)
                .populate({
                    path: 'order',
                    select: 'orderNumber customerName customerPhone deliveryAddress'
                })
                .populate({
                    path: 'orderItem',
                    select: 'productName variation quantity price'
                })
                .populate({
                    path: 'customer',
                    select: 'name phone email'
                }).lean();

            if (fullReturn) {
                populatedReturn = fullReturn;
            }
        }

        const order = populatedReturn.order;
        const item = populatedReturn.orderItem;

        if (!order || !order.deliveryAddress) {
            console.error('❌ Cannot broadcast return pickup: Order or delivery address missing');
            return;
        }

        // Get coordinates of customer
        let lat = order.deliveryAddress.latitude ? parseFloat(order.deliveryAddress.latitude) : null;
        let lng = order.deliveryAddress.longitude ? parseFloat(order.deliveryAddress.longitude) : null;

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            // Default fallback if coords missing
            console.warn('⚠️ Customer address coords missing, using default search radius');
            lat = 19.0760;
            lng = 72.8777;
        }

        // Find nearby delivery boys within 10km
        const nearbyDeliveryBoys = await findDeliveryBoysNearLocation(lat, lng, 10);

        if (nearbyDeliveryBoys.length === 0) {
            console.log('⚠️ No available delivery boys near customer for return pickup');
            return;
        }

        let nearbyBoyIds = nearbyDeliveryBoys.map(b => b.deliveryBoyId);

        // Filter out busy delivery boys
        const busyBoys = await Order.find({
            deliveryBoy: { $in: nearbyBoyIds },
            deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
            status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
        }).distinct('deliveryBoy');

        const busyBoysSet = new Set(busyBoys.map(id => id.toString()));
        nearbyBoyIds = nearbyBoyIds.filter(id => !busyBoysSet.has(id.toString()));

        if (nearbyBoyIds.length === 0) {
            console.log('⚠️ All nearby delivery boys are busy. Cannot broadcast return pickup right now.');
            return;
        }

        // Get return pickup fee config
        const settings = await AppSettings.getSettings();
        const returnPickupFee = settings.returnPickupFee || 20;

        const returnNotificationData = {
            returnId: populatedReturn._id.toString(),
            orderNumber: order.orderNumber,
            customerName: order.customerName || populatedReturn.customer?.name || "Customer",
            customerPhone: order.customerPhone || populatedReturn.customer?.phone || "",
            deliveryAddress: {
                address: order.deliveryAddress.address,
                city: order.deliveryAddress.city,
                state: order.deliveryAddress.state,
                pincode: order.deliveryAddress.pincode,
            },
            productName: item?.productName || "Product",
            variation: item?.variation || "",
            quantity: populatedReturn.quantity || item?.quantity || 1,
            reason: populatedReturn.reason || "Return",
            description: populatedReturn.description || "",
            images: populatedReturn.images || [],
            expectedEarning: returnPickupFee,
            createdAt: populatedReturn.createdAt
        };

        const notifiedIds = new Set<string>();

        const deliveryBoys = await Delivery.find({
            _id: { $in: nearbyBoyIds }
        }).select('_id fcmTokens fcmTokenMobile name');

        const deliveryBoyMap = new Map(deliveryBoys.map(db => [db._id.toString(), db]));

        // Broadcast to individual delivery boy rooms
        for (const id of nearbyBoyIds) {
            const idString = id.toString().trim();
            const roomName = `delivery-${idString}`;
            const room = io.sockets.adapter.rooms.get(roomName);
            const deliveryBoy = deliveryBoyMap.get(idString);

            if (room && room.size > 0) {
                notifiedIds.add(idString);
                io.to(roomName).emit('new-return-pickup', returnNotificationData);
                console.log(`✅ Emitted new-return-pickup to room: ${roomName}`);
            } else {
                console.log(`ℹ️ Room ${roomName} is empty or does not exist. Fallback to FCM for return pickup.`);
                if (deliveryBoy) {
                    const tokens = [
                        ...(deliveryBoy.fcmTokenMobile || []),
                        ...(deliveryBoy.fcmTokens || [])
                    ];

                    if (tokens.length > 0) {
                        notifiedIds.add(idString);
                        sendPushNotification(tokens, {
                            title: 'Return Pickup Available! 🔄',
                            body: `Return pickup for order #${order.orderNumber} is available. Earn ₹${returnPickupFee}.`,
                            data: {
                                type: 'new_return_pickup',
                                returnId: populatedReturn._id.toString(),
                                orderNumber: order.orderNumber,
                                expectedEarning: returnPickupFee.toString(),
                                click_action: 'FLUTTER_NOTIFICATION_CLICK'
                            }
                        }).catch(err => console.error(`Failed to send FCM to delivery boy ${idString}:`, err));
                        
                        console.log(`📱 Sent FCM fallback for return pickup to delivery boy: ${deliveryBoy?.name || idString}`);
                    }
                }
            }
        }

        if (notifiedIds.size === 0) {
            console.log('⚠️ No connected delivery boys found for return pickup');
            return;
        }

        const returnIdStr = populatedReturn._id.toString();
        returnNotificationStates.set(returnIdStr, {
            returnId: returnIdStr,
            notifiedDeliveryBoys: notifiedIds,
            rejectedDeliveryBoys: new Set(),
            acceptedBy: null
        });

        console.log(`📢 Broadcasted return pickup ${populatedReturn._id} to ${notifiedIds.size} riders`);

        // Start 10-minute timeout timer
        setTimeout(async () => {
            try {
                const currentState = returnNotificationStates.get(returnIdStr);
                if (currentState && !currentState.acceptedBy) {
                    const ret = await Return.findById(returnIdStr);
                    if (ret && !ret.deliveryBoy && ret.pickupStatus === 'Pending') {
                        ret.pickupStatus = 'Unassigned';
                        ret.qcNotes = (ret.qcNotes ? ret.qcNotes + '\n' : '') +
                            `[${new Date().toISOString()}] Broadcast timed out (10 mins) with no rider acceptance.`;
                        await ret.save();
                        console.log(`⏰ Return pickup ${returnIdStr} broadcast timed out. Marked Unassigned.`);
                    }
                    returnNotificationStates.delete(returnIdStr);
                }
            } catch (timeoutErr) {
                console.error(`Error in return pickup broadcast timeout for ${returnIdStr}:`, timeoutErr);
            }
        }, 10 * 60 * 1000);
    } catch (error) {
        console.error('Error in notifyDeliveryBoysOfReturnPickup:', error);
    }
}

/**
 * Handle acceptance of return pickup
 */
export async function handleReturnPickupAcceptance(
    io: SocketIOServer,
    returnId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const state = returnNotificationStates.get(returnId);
        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();

        if (state) {
            if (state.acceptedBy) {
                return { success: false, message: 'Return pickup already accepted by another rider' };
            }
            if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                return { success: false, message: 'You were not notified about this return pickup' };
            }
            if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                return { success: false, message: 'You already rejected this return pickup' };
            }
            state.acceptedBy = normalizedDeliveryBoyId;
        }

        const returnReq = await Return.findById(returnId);
        if (!returnReq) {
            return { success: false, message: 'Return request not found' };
        }

        if (returnReq.deliveryBoy) {
            return { success: false, message: 'Return pickup already assigned' };
        }

        returnReq.deliveryBoy = new mongoose.Types.ObjectId(normalizedDeliveryBoyId);
        returnReq.pickupStatus = 'Assigned';
        returnReq.assignedAt = new Date();
        await returnReq.save();

        if (state) {
            for (const notifiedId of state.notifiedDeliveryBoys) {
                io.to(`delivery-${notifiedId}`).emit('return-pickup-accepted', {
                    returnId,
                    acceptedBy: normalizedDeliveryBoyId
                });
            }
            returnNotificationStates.delete(returnId);
        } else {
            io.to(`delivery-${normalizedDeliveryBoyId}`).emit('return-pickup-accepted', {
                returnId,
                acceptedBy: normalizedDeliveryBoyId
            });
        }

        console.log(`✅ Return pickup ${returnId} accepted by rider ${normalizedDeliveryBoyId}`);
        return { success: true, message: 'Return pickup accepted successfully' };
    } catch (error) {
        console.error('Error handling return pickup acceptance:', error);
        return { success: false, message: 'Error accepting return pickup' };
    }
}

/**
 * Handle rejection of return pickup
 */
export async function handleReturnPickupRejection(
    _io: SocketIOServer,
    returnId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string; allRejected: boolean }> {
    try {
        const state = returnNotificationStates.get(returnId);
        if (!state) {
            return { success: false, message: 'Return pickup notification not found', allRejected: false };
        }

        if (state.acceptedBy) {
            return { success: false, message: 'Already accepted', allRejected: false };
        }

        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();
        state.rejectedDeliveryBoys.add(normalizedDeliveryBoyId);

        const allRejected = state.rejectedDeliveryBoys.size === state.notifiedDeliveryBoys.size;
        if (allRejected) {
            returnNotificationStates.delete(returnId);
            console.log(`🚫 All riders rejected return pickup ${returnId}`);
            try {
                const ret = await Return.findById(returnId);
                if (ret && !ret.deliveryBoy && ret.pickupStatus === 'Pending') {
                    ret.pickupStatus = 'Unassigned';
                    ret.qcNotes = (ret.qcNotes ? ret.qcNotes + '\n' : '') +
                        `[${new Date().toISOString()}] Rejected: All notified delivery boys (${state.notifiedDeliveryBoys.size}) rejected the return pickup.`;
                    await ret.save();
                    console.log(`✅ Updated Return ${returnId} pickupStatus to Unassigned.`);
                }
            } catch (dbErr) {
                console.error(`Error updating Return ${returnId} on all rejection:`, dbErr);
            }
        }

        return { success: true, message: 'Return pickup rejected', allRejected };
    } catch (error) {
        console.error('Error handling return pickup rejection:', error);
        return { success: false, message: 'Error rejecting return pickup', allRejected: false };
    }
}
