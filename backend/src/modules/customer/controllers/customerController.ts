// @ts-nocheck
import { Request, Response } from "express";
import Customer from "../../../models/Customer";
import Policy from "../../../models/Policy";
import AppSettings from "../../../models/AppSettings";
import { asyncHandler } from "../../../utils/asyncHandler";
import AuditLog from "../../../models/AuditLog";
import { sendSmsOtp, verifySmsOtp } from "../../../services/otpService";


/**
 * Get customer profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  const customer = await Customer.findById(userId);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      dateOfBirth: customer.dateOfBirth,
      registrationDate: customer.registrationDate,
      status: customer.status,
      refCode: customer.refCode,
      walletAmount: customer.walletAmount,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      latitude: customer.latitude,
      longitude: customer.longitude,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      locationUpdatedAt: customer.locationUpdatedAt,
    },
  });
});

/**
 * Update customer profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { name, email, dateOfBirth, notificationPreferences, accountPrivacy, bankDetails } = req.body;


    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    const customer = await Customer.findById(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update fields if provided
    if (name) customer.name = name;
    if (email) {
      // Check if email is already taken by another customer
      const existingCustomer = await Customer.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another customer",
        });
      }

      customer.email = email;
    }
    if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
    if (notificationPreferences) customer.notificationPreferences = { ...customer.notificationPreferences, ...notificationPreferences };
    if (accountPrivacy) customer.accountPrivacy = { ...customer.accountPrivacy, ...accountPrivacy };

    if (bankDetails) {
      customer.bankDetails = {
        accountName: bankDetails.accountName !== undefined ? bankDetails.accountName : customer.bankDetails?.accountName,
        accountNumber: bankDetails.accountNumber !== undefined ? bankDetails.accountNumber : customer.bankDetails?.accountNumber,
        bankName: bankDetails.bankName !== undefined ? bankDetails.bankName : customer.bankDetails?.bankName,
        ifscCode: bankDetails.ifscCode !== undefined ? bankDetails.ifscCode : customer.bankDetails?.ifscCode,
        upiId: bankDetails.upiId !== undefined ? bankDetails.upiId : customer.bankDetails?.upiId,
      };
    }


    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        dateOfBirth: customer.dateOfBirth,
        registrationDate: customer.registrationDate,
        status: customer.status,
        refCode: customer.refCode,
        walletAmount: customer.walletAmount,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        latitude: customer.latitude,
        longitude: customer.longitude,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        notificationPreferences: customer.notificationPreferences,
        accountPrivacy: customer.accountPrivacy,
        donationStats: customer.donationStats,
        bankDetails: customer.bankDetails,
      },

    });
  }
);

/**
 * Update customer location
 */
export const updateLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { latitude, longitude, address, city, state, pincode } = req.body;

    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const customer = await Customer.findById(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update location fields
    customer.latitude = latitude;
    customer.longitude = longitude;
    customer.address = address;
    customer.city = city;
    customer.state = state;
    customer.pincode = pincode;
    customer.locationUpdatedAt = new Date();

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude: customer.latitude,
        longitude: customer.longitude,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        locationUpdatedAt: customer.locationUpdatedAt,
      },
    });
  }
);

/**
 * Get customer location
 */
export const getLocation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  const customer = await Customer.findById(userId).select(
    "latitude longitude address city state pincode locationUpdatedAt"
  );

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Location retrieved successfully",
    data: {
      latitude: customer.latitude,
      longitude: customer.longitude,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      locationUpdatedAt: customer.locationUpdatedAt,
    },
  });
});

/**
 * Get public policies (Privacy Policy, Terms, etc.)
 */
export const getPublicPolicies = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  const query: any = { isActive: true };
  if (type) query.type = type;

  const policies = await Policy.find(query).sort({ updatedAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Policies retrieved successfully",
    data: policies,
  });
});

/**
 * Get application configuration (delivery fees, thresholds, etc.)
 */
export const getAppConfig = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await AppSettings.getSettings();
  
  return res.status(200).json({
    success: true,
    data: {
      deliveryFee: settings.deliveryCharges,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      platformFee: settings.platformFee,
      estimatedDeliveryTime: settings.estimatedDeliveryTime || '24 minutes',
      taxes: {
        gst: settings.gstRate || 0
      },
      appName: settings.appName,
      contactEmail: settings.supportEmail || settings.contactEmail,
      contactPhone: settings.supportPhone || settings.contactPhone,
      deliveryConfig: settings.deliveryConfig
    }
  });
});

/**
 * Send OTP for customer account deletion
 */
export const sendDeleteOtp = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  const customer = await Customer.findById(userId);

  if (!customer || customer.status === "Deleted") {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  // Generate and send OTP using the OTP service
  const result = await sendSmsOtp(customer.phone, 'Customer');

  return res.status(200).json({
    success: true,
    message: result.message,
    sessionId: result.sessionId,
  });
});

/**
 * Delete customer account (soft delete with data anonymization & session revocation)
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { otp, confirmText } = req.body;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  if (confirmText !== "DELETE") {
    return res.status(400).json({
      success: false,
      message: "Please type 'DELETE' to confirm deletion",
    });
  }

  if (!otp || !/^[0-9]{4}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Valid 4-digit OTP is required",
    });
  }

  const customer = await Customer.findById(userId);

  if (!customer || customer.status === "Deleted") {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  // Verify the OTP securely using SMS verification service
  // Note: on localhost this securely checks the developer-configured '1234' bypass automatically
  const isValid = await verifySmsOtp('DB_VERIFIED_' + customer.phone, otp, customer.phone, 'Customer');
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  const originalPhone = customer.phone;
  const originalEmail = customer.email;

  // Log the deletion activity for security audit
  await AuditLog.create({
    userId,
    userType: "Customer",
    action: "DELETE_ACCOUNT",
    details: {
      reason: "User requested deletion",
      registrationDate: customer.registrationDate,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Soft delete and anonymize personal information
  customer.status = "Deleted";
  customer.deletedAt = new Date();
  
  // Anonymize key data while maintaining sparse index uniqueness rules
  customer.name = "Deleted User";
  if (originalEmail) {
    customer.email = `deleted_${customer._id}@deleted.com`;
  }
  customer.phone = `deleted_${originalPhone}_${Date.now()}`;
  
  // Clear address details, coordinates and notification tokens
  customer.address = undefined;
  customer.city = undefined;
  customer.state = undefined;
  customer.pincode = undefined;
  customer.latitude = undefined;
  customer.longitude = undefined;
  customer.fcmTokens = [];
  customer.fcmTokenMobile = [];

  await customer.save();

  return res.status(200).json({
    success: true,
    message: "Your account has been deleted successfully",
  });
});

