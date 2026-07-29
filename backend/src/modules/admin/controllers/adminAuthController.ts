import { Request, Response } from "express";
import Admin from "../../../models/Admin";
import {
  sendOTP as sendOTPService,
  verifyOTP as verifyOTPService,
} from "../../../services/otpService";
import { generateToken, generateRefreshToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Send OTP to admin mobile number
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if admin exists with this mobile
  const admin = await Admin.findOne({ mobile });
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found with this mobile number",
    });
  }

  // Send OTP - for login, always use default OTP
  const result = await sendOTPService(mobile, "Admin", true);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Verify OTP and login admin
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, otp } = req.body;

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

  // Verify OTP
  const isValid = await verifyOTPService(mobile, otp, "Admin");
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Find admin
  const admin = await Admin.findOne({ mobile }).select("-password");
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found",
    });
  }

  // Generate JWT token
  const token = generateToken(admin._id.toString(), "Admin", admin.role);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        mobile: admin.mobile,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

/**
 * Register new admin (optional - typically admins are created by super admin)
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, mobile, email, password, role } = req.body;

  // Validation
  if (!firstName || !lastName || !mobile || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({
    $or: [{ mobile }, { email }],
  });

  if (existingAdmin) {
    return res.status(409).json({
      success: false,
      message: "Admin already exists with this mobile or email",
    });
  }

  // Create new admin
  const admin = await Admin.create({
    firstName,
    lastName,
    mobile,
    email,
    password,
    role: role || "Admin",
  });

  // Generate token
  const token = generateToken(admin._id.toString(), "Admin", admin.role);

  return res.status(201).json({
    success: true,
    message: "Admin registered successfully",
    data: {
      token,
      user: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        mobile: admin.mobile,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

/**
 * Login admin with Email and Password
 */
export const loginWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Find admin and explicitly select password for comparison
  const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");
  
  if (!admin) {
    // Return generic error message to prevent email enumeration
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  // Validate password
  const isMatch = await admin.comparePassword(password);
  
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  // Generate tokens
  const token = generateToken(admin._id.toString(), "Admin", admin.role);
  const refreshToken = generateRefreshToken(admin._id.toString(), "Admin", admin.role);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      refreshToken,
      user: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        mobile: admin.mobile,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

