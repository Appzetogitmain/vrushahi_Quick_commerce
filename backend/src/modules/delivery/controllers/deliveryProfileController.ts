import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";
import AuditLog from "../../../models/AuditLog";
import { sendSmsOtp, verifySmsOtp } from "../../../services/otpService";

/**
 * Update Delivery Profile
 * Updates personal and vehicle information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const {
        name,
        email,
        address,
        city,
        vehicleNumber,
        vehicleType,
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        policeVerificationForm
    } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Update fields if provided
    if (name) delivery.name = name;
    if (email) delivery.email = email;
    if (address) delivery.address = address;
    if (city) delivery.city = city;
    if (vehicleNumber) delivery.vehicleNumber = vehicleNumber;
    if (vehicleType) delivery.vehicleType = vehicleType;

    // Bank details updates
    if (accountName !== undefined) delivery.accountName = accountName;
    if (bankName) delivery.bankName = bankName;
    if (accountNumber) delivery.accountNumber = accountNumber;
    if (ifscCode) delivery.ifscCode = ifscCode;
    if (upiId !== undefined) delivery.upiId = upiId;
    if (policeVerificationForm) {
        if (delivery.policeVerificationForm && delivery.policeVerificationForm.trim() !== "") {
            return res.status(400).json({
                success: false,
                message: "Police verification form has already been submitted."
            });
        }
        delivery.policeVerificationForm = policeVerificationForm;
    }

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: delivery
    });
});

/**
 * Update Availability Status
 * Toggles isOnline status
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isOnline status must be a boolean"
        });
    }

    const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { 
            isOnline,
            available: isOnline ? 'Available' : 'Not Available'
        },
        { new: true }
    );

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: `Status updated to ${isOnline ? 'Online' : 'Offline'}`,
        data: {
            isOnline: delivery.isOnline
        }
    });
});

/**
 * Update Delivery Settings
 * Updates notification, location, sound preferences
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { notifications, location, sound } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Initialize settings if not present
    if (!delivery.settings) {
        delivery.settings = {
            notifications: true,
            location: true,
            sound: true
        };
    }

    if (typeof notifications === 'boolean') delivery.settings.notifications = notifications;
    if (typeof location === 'boolean') delivery.settings.location = location;
    if (typeof sound === 'boolean') delivery.settings.sound = sound;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: delivery.settings
    });
});

/**
 * Resubmit Profile for Approval
 * Manually resets status to Inactive and increments submissionCount
 */
export const resubmitForApproval = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    if (delivery.status !== 'Rejected') {
        return res.status(400).json({
            success: false,
            message: "Only rejected profiles can be resubmitted"
        });
    }

    delivery.status = 'Inactive';
    delivery.rejectionReason = '';

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Profile resubmitted for approval successfully",
        data: delivery
    });
});

/**
 * Send OTP for delivery partner account deletion
 */
export const sendDeleteOtp = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery || delivery.status === "Deleted") {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found",
        });
    }

    // Generate and send OTP using OTP service
    const result = await sendSmsOtp(delivery.mobile, 'Delivery');

    return res.status(200).json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
    });
});

/**
 * Delete delivery partner account (soft delete with data anonymization & session revocation)
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { otp, confirmText } = req.body;

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

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery || delivery.status === "Deleted") {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found",
        });
    }

    // Verify OTP using SMS verification service
    const isValid = await verifySmsOtp('DB_VERIFIED_' + delivery.mobile, otp, delivery.mobile, 'Delivery');
    if (!isValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired OTP",
        });
    }

    // Log the deletion activity for security audit
    await AuditLog.create({
        userId: deliveryId,
        userType: "Delivery",
        action: "DELETE_ACCOUNT",
        details: {
            reason: "Delivery partner requested deletion",
            registrationDate: delivery.createdAt,
            balance: delivery.balance,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
    });

    // Hard delete from database
    await Delivery.findByIdAndDelete(deliveryId);

    return res.status(200).json({
        success: true,
        message: "Your delivery account has been deleted successfully",
    });
});
