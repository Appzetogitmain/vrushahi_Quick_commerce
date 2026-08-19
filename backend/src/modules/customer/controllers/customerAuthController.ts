// @ts-nocheck
import { Request, Response } from "express";
import Customer from "../../../models/Customer";
import {
  sendSmsOtp as sendSmsOtpService,
  verifySmsOtp as verifySmsOtpService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Send SMS OTP to customer mobile number
 * Returns session_id for verification
 */
export const sendSmsOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Send SMS OTP - no need to check if customer exists
  // New customers will be auto-created upon OTP verification
  const result = await sendSmsOtpService(mobile, 'Customer');

  return res.status(200).json({
    success: true,
    message: result.message,
    sessionId: result.sessionId,
  });
});

/**
 * Verify SMS OTP and login customer
 * Requires session_id and otp
 * Auto-creates customer if not exists
 */
export const verifySmsOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, otp, sessionId } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  if (!otp || !/^[0-9]{4}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Valid 4-digit OTP is required",
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Session ID is required for verification",
    });
  }

  // Verify SMS OTP
  const isValid = await verifySmsOtpService(sessionId, otp, mobile, 'Customer');
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Find or create customer
  let customer = await Customer.findOne({ phone: mobile });
  let isNewUser = false;

  if (!customer) {
    // Auto-create new customer with placeholder data
    customer = await Customer.create({
      phone: mobile,
      name: "User",
      email: `${mobile}@kosil.temp`,
      status: "Active",
      walletAmount: 0,
      totalOrders: 0,
      totalSpent: 0,
    });
    isNewUser = true;
  }

  // Save FCM token if provided in request
  try {
    const fcmToken = req.body.fcmToken ||
      req.body.fcm_token ||
      req.body.token ||
      req.body.deviceToken ||
      req.body.device_token;

    if (fcmToken) {
      const isMobile = req.body.platform === 'mobile' ||
        req.headers['user-agent']?.includes('Dart') ||
        req.headers['user-agent']?.includes('Flutter') ||
        /iPhone|iPad|iPod|Android/i.test(req.headers['user-agent'] || '');

      if (isMobile) {
        if (!customer.fcmTokenMobile) customer.fcmTokenMobile = [];
        if (!customer.fcmTokenMobile.includes(fcmToken)) {
          customer.fcmTokenMobile.push(fcmToken);
          if (customer.fcmTokenMobile.length > 10) customer.fcmTokenMobile = customer.fcmTokenMobile.slice(-10);
        }
      } else {
        if (!customer.fcmTokens) customer.fcmTokens = [];
        if (!customer.fcmTokens.includes(fcmToken)) {
          customer.fcmTokens.push(fcmToken);
          if (customer.fcmTokens.length > 10) customer.fcmTokens = customer.fcmTokens.slice(-10);
        }
      }
      await customer.save();
      console.log(`✅ FCM token registered on OTP login for customer: ${customer.phone}`);
    }
  } catch (fcmErr) {
    console.warn("Could not save FCM token during OTP verification:", fcmErr);
  }

  // Generate JWT token
  const token = generateToken(customer._id.toString(), "Customer");

  return res.status(200).json({
    success: true,
    message: isNewUser ? "Account created and login successful" : "Login successful",
    data: {
      token,
      user: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        walletAmount: customer.walletAmount,
        refCode: customer.refCode,
        status: customer.status,
      },
      isNewUser,
    },
  });
});
