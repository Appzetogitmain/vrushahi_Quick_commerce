import Order from '../models/Order';
import Customer from '../models/Customer';
import Seller from '../models/Seller';
import OrderItem from '../models/OrderItem';
import { generateOTP, sendSmsOtp } from './otpService';
import mongoose from 'mongoose';

/**
 * Generate delivery OTP is no longer needed for regular orders.
 * Customer has a permanent deliveryOtp that is generated on account creation.
 * This function is kept for backward compatibility but does nothing meaningful now.
 */
export async function generateDeliveryOtp(orderId: string): Promise<{ success: boolean; message: string }> {
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'Delivered') {
      throw new Error('Order is already delivered');
    }

    // No longer generate per-order OTP - customer has permanent deliveryOtp
    // Just return success as the customer's permanent OTP will be used
    console.log(`[Delivery OTP] Using customer's permanent delivery OTP for order ${orderId}`);

    return {
      success: true,
      message: 'Customer has a permanent delivery OTP. Share it with the delivery partner.',
    };
  } catch (error: any) {
    console.error('Error in generateDeliveryOtp:', error);
    throw new Error(error.message || 'Failed to process delivery OTP request');
  }
}

/**
 * Verify delivery OTP using customer's permanent OTP
 */
export async function verifyDeliveryOtp(orderId: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    const order = await Order.findById(orderId).populate('customer');

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'Delivered') {
      throw new Error('Order is already delivered');
    }

    // Get customer's permanent delivery OTP
    let customerOtp: string | undefined;

    if (order.customer && typeof order.customer === 'object' && 'deliveryOtp' in order.customer) {
      customerOtp = (order.customer as any).deliveryOtp;
    } else if (order.customer) {
      // If not populated, fetch customer
      const customer = await Customer.findById(order.customer);
      customerOtp = customer?.deliveryOtp;
    }

    if (!customerOtp) {
      throw new Error('Customer delivery OTP not found. Please contact support.');
    }

    // Developer bypass for testing
    if ((process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_OTP === 'true') && otp === '9999') {
      order.deliveryOtpVerified = true;
      order.status = 'Delivered';
      order.deliveredAt = new Date();
      order.invoiceEnabled = true;
      await order.save();

      return {
        success: true,
        message: 'OTP verified successfully. Order marked as delivered.',
      };
    }

    // Verify OTP against customer's permanent OTP
    if (customerOtp !== otp) {
      throw new Error('Invalid OTP. Please check and try again.');
    }

    // Mark order as delivered
    order.deliveryOtpVerified = true;
    order.status = 'Delivered';
    order.deliveredAt = new Date();
    order.invoiceEnabled = true;
    await order.save();

    return {
      success: true,
      message: 'OTP verified successfully. Order marked as delivered.',
    };
  } catch (error: any) {
    console.error('Error verifying delivery OTP:', error);
    throw new Error(error.message || 'Failed to verify delivery OTP');
  }
}

/**
 * Generate OTP for seller pickup
 */
export async function generateSellerPickupOtp(orderId: string, sellerId: string): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    const seller = await Seller.findById(sellerId);
    if (!seller) throw new Error('Seller not found');

    // Ensure sellerPickups array exists
    if (!order.sellerPickups) {
      order.sellerPickups = [];
    }

    let pickupIndex = order.sellerPickups.findIndex(
      (p: any) => p.seller.toString() === sellerId
    );

    // If not found in sellerPickups, check if they have items in this order
    if (pickupIndex === -1) {
      const hasItems = await OrderItem.exists({ order: orderId, seller: sellerId });
      if (!hasItems) {
        throw new Error('Seller does not have any items in this order');
      }

      // Initialize the pickup entry for this seller
      order.sellerPickups.push({
        seller: new mongoose.Types.ObjectId(sellerId),
        pickupOtpVerified: false
      } as any);
      pickupIndex = order.sellerPickups.length - 1;
    }

    const pickup = order.sellerPickups[pickupIndex];

    // Check 60s cooldown
    if (pickup.pickupOtpLastSentAt) {
      const diff = Date.now() - new Date(pickup.pickupOtpLastSentAt).getTime();
      if (diff < 60000) {
        throw new Error(`Please wait ${Math.ceil((60000 - diff) / 1000)}s before requesting another OTP`);
      }
    }

    const otp = generateOTP(4);
    pickup.pickupOtp = otp;
    pickup.pickupOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    pickup.pickupOtpLastSentAt = new Date();
    pickup.pickupOtpVerified = false;

    await order.save();

    // Send SMS to seller
    try {
      if (seller.mobile) {
        await sendSmsOtp(seller.mobile, 'Seller');
      }
    } catch (smsError) {
      console.error('Failed to send pickup SMS:', smsError);
      // Continue, as the OTP is still visible in the app
    }

    return {
      success: true,
      message: 'Pickup OTP sent to seller and available in seller app.',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined // Return for dev/testing
    };
  } catch (error: any) {
    console.error('Error in generateSellerPickupOtp:', error);
    throw new Error(error.message || 'Failed to generate pickup OTP');
  }
}

/**
 * Verify OTP for seller pickup
 */
export async function verifySellerPickupOtp(orderId: string, sellerId: string, otp: string): Promise<boolean> {
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    // Ensure sellerPickups array exists
    if (!order.sellerPickups) {
      order.sellerPickups = [];
    }

    let pickupIndex = order.sellerPickups.findIndex(
      (p: any) => p.seller.toString() === sellerId
    );

    if (pickupIndex === -1) {
      const hasItems = await OrderItem.exists({ order: orderId, seller: sellerId });
      if (!hasItems) {
        throw new Error('Seller does not have any items in this order');
      }
      
      order.sellerPickups.push({
        seller: new mongoose.Types.ObjectId(sellerId),
        pickupOtpVerified: false
      } as any);
      pickupIndex = order.sellerPickups.length - 1;
    }

    const pickup = order.sellerPickups[pickupIndex];

    if (pickup.pickupOtpVerified) return true;

    // Developer bypass
    if ((process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_OTP === 'true') && otp === '9999') {
      pickup.pickupOtpVerified = true;
      await order.save();
      return true;
    }

    if (!pickup.pickupOtp || pickup.pickupOtp !== otp) {
      throw new Error('Invalid pickup OTP');
    }

    if (pickup.pickupOtpExpiresAt && new Date(pickup.pickupOtpExpiresAt) < new Date()) {
      throw new Error('Pickup OTP has expired');
    }

    pickup.pickupOtpVerified = true;
    await order.save();

    return true;
  } catch (error: any) {
    console.error('Error in verifySellerPickupOtp:', error);
    throw new Error(error.message || 'Failed to verify pickup OTP');
  }
}
