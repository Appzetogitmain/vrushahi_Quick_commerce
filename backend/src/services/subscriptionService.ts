import SubscriptionPlan from '../models/SubscriptionPlan';
import SellerSubscription from '../models/SellerSubscription';
import Seller from '../models/Seller';
import { createRazorpayOrder, verifyPaymentSignature } from './paymentService';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

/**
 * Creates a Razorpay order for a subscription plan purchase
 */
export const createSubscriptionPaymentOrder = async (sellerId: string, planId: string) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new Error('Seller not found');
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new Error('Subscription plan not found or is inactive');
  }

  // Create a unique receipt ID for subscription (max 40 chars for Razorpay)
  const shortSellerId = sellerId.substring(0, 10);
  const receiptId = `sub_${shortSellerId}_${Date.now()}`;

  // Call the existing razorpay integration
  const orderResult = await createRazorpayOrder(receiptId, plan.discountedPrice);

  if (!orderResult.success || !orderResult.data) {
    throw new Error(orderResult.message || 'Failed to create payment order');
  }

  return {
    ...orderResult.data,
    planDetails: {
      id: plan._id,
      name: plan.name,
      amount: plan.discountedPrice,
      duration: plan.duration,
    }
  };
};

/**
 * Activates a subscription after successful payment
 */
export const activateSubscription = async (
  sellerId: string, 
  planId: string, 
  paymentDetails: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  isRenewal: boolean = false
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isValid = verifyPaymentSignature(
      paymentDetails.razorpayOrderId,
      paymentDetails.razorpayPaymentId,
      paymentDetails.razorpaySignature
    );

    if (!isValid) {
      throw new Error('Invalid payment signature');
    }

    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) throw new Error('Seller not found');

    const plan = await SubscriptionPlan.findById(planId).session(session);
    if (!plan) throw new Error('Plan not found');

    // Calculate dates
    const startDate = new Date();
    const expiryDate = new Date();
    
    // If it's a renewal and the current subscription is still active, append to current expiry
    if (isRenewal && seller.subscriptionStatus === 'Active' && seller.currentSubscriptionId) {
      const currentSub = await SellerSubscription.findById(seller.currentSubscriptionId).session(session);
      if (currentSub && currentSub.expiryDate > new Date()) {
        startDate.setTime(currentSub.expiryDate.getTime());
        expiryDate.setTime(currentSub.expiryDate.getTime());
      }
    }
    
    expiryDate.setDate(expiryDate.getDate() + plan.duration);

    // Create new subscription record
    const subscription = new SellerSubscription({
      seller: sellerId,
      plan: planId,
      planName: plan.name,
      amount: plan.discountedPrice,
      startDate,
      expiryDate,
      paymentStatus: 'Paid',
      transactionId: paymentDetails.razorpayPaymentId,
      razorpayOrderId: paymentDetails.razorpayOrderId,
      status: 'Active',
      isRenewal
    });

    await subscription.save({ session });

    // Update seller status
    seller.businessModel = 'Subscription';
    seller.subscriptionStatus = 'Active';
    seller.currentSubscriptionId = subscription._id as mongoose.Types.ObjectId;
    
    // If they were Payment Pending, they are now fully Approved
    if (seller.status === 'Payment Pending') {
      seller.status = 'Approved';
    }

    await seller.save({ session });
    await session.commitTransaction();

    return { success: true, subscription };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error activating subscription:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Switches a seller back to Commission model
 */
export const switchToCommissionModel = async (sellerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) throw new Error('Seller not found');

    if (seller.currentSubscriptionId) {
      const subscription = await SellerSubscription.findById(seller.currentSubscriptionId).session(session);
      if (subscription && subscription.status === 'Active') {
        subscription.status = 'Cancelled';
        await subscription.save({ session });
      }
    }

    seller.businessModel = 'Commission';
    seller.subscriptionStatus = 'None';
    seller.currentSubscriptionId = undefined;

    // If they were stuck at Payment Pending, switching to commission means they need admin approval again or maybe just approve them if they were previously approved.
    // To be safe, if they are Payment Pending, we'll move them back to Pending so admin can review. 
    if (seller.status === 'Payment Pending') {
      seller.status = 'Pending';
    }

    await seller.save({ session });
    await session.commitTransaction();

    return { success: true, message: 'Switched to commission model successfully' };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error switching to commission:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cron job handler to check and expire subscriptions
 */
export const checkAndExpireSubscriptions = async (io?: Server) => {
  console.log('[Cron] Checking for expired subscriptions...');
  const now = new Date();

  try {
    // ── Step 1: Find all active subscriptions that have already expired ──
    const expiredSubscriptions = await SellerSubscription.find({
      status: 'Active',
      expiryDate: { $lte: now }
    });

    if (expiredSubscriptions.length === 0) {
      console.log('[Cron] No expired subscriptions found.');
    } else {
      console.log(`[Cron] Found ${expiredSubscriptions.length} expired subscriptions. Processing...`);

      for (const sub of expiredSubscriptions) {
        // ✅ FIX: Create a FRESH session per subscription.
        // Previously one session was reused across the loop — after the first
        // commit/abort the session was exhausted and all subsequent sellers silently failed.
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Mark subscription record as Expired
          sub.status = 'Expired';
          await sub.save({ session });

          // Update seller: fall back to Commission model
          const seller = await Seller.findById(sub.seller).session(session);
          if (seller) {
            seller.businessModel = 'Commission';
            seller.subscriptionStatus = 'Expired';
            await seller.save({ session });

            // Real-time push notification to seller if online
            if (io) {
              io.to(`seller-${seller._id.toString()}`).emit('subscription_expired', {
                message: 'Your subscription has expired. You have been switched to the Commission model.'
              });
            }
          }

          await session.commitTransaction();
          console.log(`[Cron] ✅ Expired subscription ${sub._id} for seller ${sub.seller}`);
        } catch (err) {
          if (session.inTransaction()) {
            await session.abortTransaction();
          }
          console.error(`[Cron] ❌ Failed to expire subscription ${sub._id}:`, err);
        } finally {
          session.endSession();
        }
      }
    }

    // ── Step 2: Send advance warning — 7 days before expiry ──
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const warning7 = await SellerSubscription.find({
      status: 'Active',
      expiryDate: { $gt: now, $lte: in7Days }
    }).populate<{ seller: { _id: mongoose.Types.ObjectId; sellerName: string } }>('seller', 'sellerName');

    for (const sub of warning7) {
      if (io && sub.seller) {
        const daysLeft = Math.ceil((sub.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        io.to(`seller-${sub.seller._id.toString()}`).emit('subscription_expiry_warning', {
          message: `Your subscription expires in ${daysLeft} day(s). Renew now to keep enjoying 0% commission.`,
          expiryDate: sub.expiryDate,
          daysLeft
        });
        console.log(`[Cron] ⚠️ Sent ${daysLeft}-day expiry warning to seller ${sub.seller._id}`);
      }
    }

  } catch (error) {
    console.error('[Cron] Error running subscription expiry check:', error);
  }
};

export const getSubscriptionStats = async () => {
  const [totalSubscribers, activeSubscriptions, cancelledSubscriptions, revenueStats] = await Promise.all([
    SellerSubscription.countDocuments(),
    SellerSubscription.countDocuments({ status: 'Active' }),
    SellerSubscription.countDocuments({ status: { $in: ['Expired', 'Cancelled'] } }),
    SellerSubscription.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ])
  ]);

  const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;

  return {
    totalSubscribers,
    activeSubscriptions,
    cancelledSubscriptions,
    totalRevenue
  };
};
