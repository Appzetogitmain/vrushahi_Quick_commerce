import { Server as SocketIOServer } from 'socket.io';
import Return from '../models/Return';
import Order from '../models/Order';
import AppSettings from '../models/AppSettings';
import mongoose from 'mongoose';
import { findDeliveryBoysNearLocation } from './orderNotificationService';

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

        // Broadcast to individual delivery boy rooms
        for (const id of nearbyBoyIds) {
            const idString = id.toString().trim();
            const roomName = `delivery-${idString}`;
            const room = io.sockets.adapter.rooms.get(roomName);

            if (room && room.size > 0) {
                notifiedIds.add(idString);
                io.to(roomName).emit('new-return-pickup', returnNotificationData);
                console.log(`✅ Emitted new-return-pickup to room: ${roomName}`);
            }
        }

        if (notifiedIds.size === 0) {
            console.log('⚠️ No connected delivery boys found for return pickup');
            return;
        }

        returnNotificationStates.set(populatedReturn._id.toString(), {
            returnId: populatedReturn._id.toString(),
            notifiedDeliveryBoys: notifiedIds,
            rejectedDeliveryBoys: new Set(),
            acceptedBy: null
        });

        console.log(`📢 Broadcasted return pickup ${populatedReturn._id} to ${notifiedIds.size} riders`);
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
        }

        return { success: true, message: 'Return pickup rejected', allRejected };
    } catch (error) {
        console.error('Error handling return pickup rejection:', error);
        return { success: false, message: 'Error rejecting return pickup', allRejected: false };
    }
}
