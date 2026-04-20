import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment';
import Order from '../models/Order';
import mongoose from 'mongoose';

// Initialize Razorpay instance
const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    console.log('Razorpay Init:', {
        hasKeyId: !!keyId,
        hasKeySecret: !!keySecret,
        keyIdPrefix: keyId ? keyId.substring(0, 8) : 'none'
    });

    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured - please check backend .env');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

/**
 * Create a Razorpay order
 */
export const createRazorpayOrder = async (
    orderId: string,
    amount: number,
    currency: string = 'INR'
) => {
    try {
        const razorpay = getRazorpayInstance();

        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency,
            receipt: orderId,
            notes: {
                orderId,
            },
        };

        const razorpayOrder = await razorpay.orders.create(options);

        return {
            success: true,
            data: {
                razorpayOrderId: razorpayOrder.id,
                razorpayKey: process.env.RAZORPAY_KEY_ID, // Send key to frontend
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt,
            },
        };
    } catch (error: any) {
        // Log the full error object for server-side debugging
        console.error('CRITICAL: Razorpay Order Creation Error:', {
            statusCode: error.statusCode,
            error: error.error || error
        });
        
        let errorMessage = 'Failed to create Razorpay order';
        
        // Drill down into Razorpay's error structure
        if (error.statusCode === 401) {
            errorMessage = 'Razorpay Authentication Failed - Please check your API Keys in .env';
        } else if (error.error && error.error.description) {
            errorMessage = error.error.description;
        } else if (error.description) {
            errorMessage = error.description;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            message: errorMessage,
        };
    }
};

/**
 * Create a Razorpay Payment Link linked to an Order
 */
export const createRazorpayPaymentLink = async (
    orderId: string,
    razorpayOrderId: string,
    amount: number,
    description: string,
    customerInfo: { name: string; contact: string; email?: string },
    notes: any = {}
) => {
    try {
        const razorpay = getRazorpayInstance();

        // 20 minutes expiry (Razorpay requires minimum 15 minutes for Payment Links)
        const expireBy = Math.floor(Date.now() / 1000) + (20 * 60);

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            accept_partial: false,
            description,
            // Removed 'order_id' and 'upi_link' as they are not supported in the root of Payment Link V1 API
            expire_by: expireBy,
            customer: {
                name: customerInfo.name || "Customer",
                contact: customerInfo.contact || "+919999999999",
                email: customerInfo.email || "customer@example.com"
            },
            notify: {
                sms: false,
                email: false
            },
            notes: {
                ...notes,
                orderId,
                razorpayOrderId // Moving the order ID to notes for reference
            }
        };

        const paymentLink = await razorpay.paymentLink.create(options as any);

        return {
            success: true,
            data: paymentLink as any
        };
    } catch (error: any) {
        console.error('CRITICAL: Razorpay Payment Link Error:', {
            statusCode: error.statusCode,
            error: error.error || error
        });

        let errorMessage = 'Failed to create Razorpay payment link';

        if (error.statusCode === 401) {
            errorMessage = 'Razorpay Authentication Failed - Please check your API Keys in .env';
        } else if (error.error && error.error.description) {
            errorMessage = error.error.description;
        } else if (error.description) {
            errorMessage = error.description;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            message: errorMessage,
        };
    }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): boolean => {
    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            throw new Error('Razorpay key secret not configured');
        }

        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    } catch (error) {
        console.error('Error verifying payment signature:', error);
        return false;
    }
};

/**
 * Capture payment and update order
 */
export const capturePayment = async (
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Verify signature
        const isValid = verifyPaymentSignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            throw new Error('Invalid payment signature');
        }

        // Find order
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error('Order not found');
        }

        // Create payment record
        const payment = new Payment({
            order: orderId,
            customer: order.customer,
            paymentMethod: 'Online',
            paymentGateway: 'Razorpay',
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            amount: order.total,
            currency: 'INR',
            status: 'Completed',
            paidAt: new Date(),
            gatewayResponse: {
                success: true,
                message: 'Payment captured successfully',
            },
        });

        await payment.save({ session });

        // Update Platform Wallet tracking
        try {
            const PlatformWallet = (await import('../models/PlatformWallet')).default;
            const platformWallet = await PlatformWallet.getWallet();
            platformWallet.totalPlatformEarning += order.total;
            platformWallet.currentPlatformBalance += order.total;

            if (session) {
                await platformWallet.save({ session });
            } else {
                await platformWallet.save();
            }
        } catch (pwError) {
            console.error("Error updating platform wallet in capturePayment:", pwError);
        }

        // Update order
        order.paymentStatus = 'Paid';
        order.paymentId = razorpayPaymentId;
        // Keep status as Placed/Received or whatever was set.
        // Usually, online payment orders start as 'Pending' and move to 'Received'
        if (order.status === 'Pending') {
            order.status = 'Received';
        }
        await order.save({ session });

        // Trigger creation of Pending commissions
        try {
            const { createPendingCommissions } = await import('./commissionService');
            await createPendingCommissions(orderId);
        } catch (commError) {
            console.error("Failed to create pending commissions after payment:", commError);
        }

        // Trigger creation of Pending commissions
        // Note: We do this inside the transaction or right after. Ideally inside but createPendingCommissions might not support session passing yet.
        // For safety/simplicity in this refactor step, we'll do it post-commit or ensure createPendingCommissions is safe.
        // Given existing architecture, let's do it part of the flow but loosely coupled if needed.
        // Actually, for data integrity, let's run it.
        const { createPendingCommissions } = await import('./commissionService');
        await createPendingCommissions(orderId); // This creates them as 'Pending'

        await session.commitTransaction();

        return {
            success: true,
            message: 'Payment captured successfully',
            data: {
                paymentId: payment._id,
                orderId: order._id,
            },
        };
    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error capturing payment:', error);
        return {
            success: false,
            message: error.message || 'Failed to capture payment',
        };
    } finally {
        session.endSession();
    }
};

/**
 * Process refund
 */
export const processRefund = async (
    paymentId: string,
    amount?: number,
    reason?: string
) => {
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (!payment.razorpayPaymentId) {
            throw new Error('Razorpay payment ID not found');
        }

        const razorpay = getRazorpayInstance();

        const refundAmount = amount || payment.amount;

        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100), // Amount in paise
            notes: {
                reason: reason || 'Order cancelled',
            },
        });

        // Update payment record
        payment.status = 'Refunded';
        payment.refundAmount = refundAmount;
        payment.refundedAt = new Date();
        payment.refundReason = reason;
        await payment.save();

        return {
            success: true,
            message: 'Refund processed successfully',
            data: {
                refundId: refund.id,
                amount: refundAmount,
            },
        };
    } catch (error: any) {
        console.error('Error processing refund:', error);
        return {
            success: false,
            message: error.message || 'Failed to process refund',
        };
    }
};

/**
 * Handle Razorpay webhook
 */
export const handleWebhook = async (
    body: any,
    signature: string,
    io?: any
): Promise<{ success: boolean; message: string }> => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new Error('Razorpay webhook secret not configured');
        }

        // Verify webhook signature explicitly
        const shasum = crypto.createHmac('sha256', webhookSecret);
        shasum.update(JSON.stringify(body));
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            console.error('Webhook signature mismatch');
            throw new Error('Invalid webhook signature');
        }

        const event = body.event;
        console.log('Razorpay Webhook Event:', event);

        // Handle different events
        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(body.payload.payment.entity, io);
                break;

            case 'payment_link.paid':
                await handlePaymentLinkPaid(body, io);
                break;

            case 'payment.failed':
                await handlePaymentFailed(body.payload.payment.entity);
                break;

            case 'refund.created':
                await handleRefundCreated(body.payload.refund.entity);
                break;

            default:
                console.log('Unhandled webhook event:', event);
        }

        return {
            success: true,
            message: 'Webhook processed successfully',
        };
    } catch (error: any) {
        console.error('Error handling webhook:', error);
        return {
            success: false,
            message: error.message || 'Failed to process webhook',
        };
    }
};

// Helper functions for webhook events
const handlePaymentCaptured = async (payload: any, io?: any) => {
    try {
        const razorpayPaymentId = payload.id;
        const razorpayOrderId = payload.order_id;
        const orderIdFromNotes = payload.notes?.orderId;

        // Find order either by Order ID in notes (for QR) or Razorpay Order ID
        let order;
        if (orderIdFromNotes) {
            order = await Order.findById(orderIdFromNotes);
        } else if (razorpayOrderId) {
            order = await Order.findOne({ $or: [{ qrRazorpayOrderId: razorpayOrderId }, { paymentId: razorpayOrderId }] });
        }

        if (!order) {
            // Check if payment mapping exists
            const payment = await Payment.findOne({ razorpayOrderId });
            if (payment) order = await Order.findById(payment.order);
        }

        if (order) {
            // Double Check Lock
            if (order.paymentStatus === "Paid" && order.qrPaymentStatus === "Paid") {
                return; 
            }

            order.paymentStatus = 'Paid';
            if (orderIdFromNotes) {
                order.qrPaymentStatus = 'Paid';
                order.paidVia = 'ONLINE_QR';
            }
            order.paymentId = razorpayPaymentId;

            // Auto-mark as Delivered for COD QR payment during delivery
            const previousStatus = order.status;
            if (order.status === 'Picked up' || order.status === 'Out for Delivery') {
                order.status = 'Delivered';
                order.deliveryBoyStatus = 'Delivered';
                order.deliveredAt = new Date();

                // Financial transition logic
                try {
                    const { processOrderStatusTransition } = await import('./orderService');
                    await processOrderStatusTransition(order._id.toString(), 'Delivered', previousStatus);
                } catch (transitionError) {
                    console.error('Error processing auto-delivery transition in handlePaymentCaptured:', transitionError);
                }
            }
            
            await order.save();

            // Emit socket if available
            if (io && order.deliveryBoy) {
                io.to(`delivery-${order.deliveryBoy}`).emit('qr-payment-success', {
                    orderId: order._id,
                    message: 'Payment confirmed successfully'
                });
            }
        }
    } catch (error) {
        console.error('Error handling payment captured:', error);
    }
};

const handlePaymentLinkPaid = async (body: any, io?: any) => {
    try {
        const payload = body.payload;
        const paymentLink = payload.payment_link.entity;
        const razorpayPaymentId = payload.payment.entity.id;
        
        // Exact mapping as requested: payload?.payload?.payment_link?.entity?.notes?.orderId
        const orderId = paymentLink.notes?.orderId;
        
        if (!orderId) return;

        const order = await Order.findById(orderId);
        if (!order) return;

        // Double Check Lock
        if (order.paymentStatus === "Paid" && order.qrPaymentStatus === "Paid") {
            return; 
        }

        const previousStatus = order.status;
        order.paymentStatus = 'Paid';
        order.qrPaymentStatus = 'Paid';
        order.paidVia = 'ONLINE_QR';
        order.paymentId = razorpayPaymentId;

        // Auto-mark as Delivered for COD QR payment during delivery
        if (order.status === 'Picked up' || order.status === 'Out for Delivery') {
            order.status = 'Delivered';
            order.deliveryBoyStatus = 'Delivered';
            order.deliveredAt = new Date();

            // Financial transition logic
            try {
                const { processOrderStatusTransition } = await import('./orderService');
                await processOrderStatusTransition(orderId, 'Delivered', previousStatus);
            } catch (transitionError) {
                console.error('Error processing auto-delivery transition in handlePaymentLinkPaid:', transitionError);
            }
        }

        await order.save();

        if (io && order.deliveryBoy) {
            io.to(`delivery-${order.deliveryBoy}`).emit('qr-payment-success', { 
                orderId: order._id,
                message: 'Payment received successfully via QR'
            });
        }
    } catch (error) {
        console.error('Error handling payment link paid:', error);
    }
};

const handlePaymentFailed = async (payload: any) => {
    try {
        const razorpayOrderId = payload.order_id;

        // Find payment record
        const payment = await Payment.findOne({ razorpayOrderId });

        if (payment) {
            payment.status = 'Failed';
            payment.gatewayResponse = {
                success: false,
                message: payload.error_description || 'Payment failed',
                rawResponse: payload,
            };
            await payment.save();

            // Update order
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'Failed',
            });
        }
    } catch (error) {
        console.error('Error handling payment failed:', error);
    }
};

const handleRefundCreated = async (payload: any) => {
    try {
        const razorpayPaymentId = payload.payment_id;

        // Find payment record
        const payment = await Payment.findOne({ razorpayPaymentId });

        if (payment) {
            payment.status = 'Refunded';
            payment.refundAmount = payload.amount / 100; // Convert from paise
            payment.refundedAt = new Date();
            await payment.save();

            // Update order
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'Refunded',
            });
        }
    } catch (error) {
        console.error('Error handling refund created:', error);
    }
};
