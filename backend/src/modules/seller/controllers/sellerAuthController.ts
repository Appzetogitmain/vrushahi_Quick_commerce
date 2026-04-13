import { Request, Response } from "express";
import Seller from "../../../models/Seller";
import {
  sendOTP as sendOTPService,
  verifyOTP as verifyOTPService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Send OTP to seller mobile number
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, type = 'login' } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if seller exists with this mobile
  const seller = await Seller.findOne({ mobile });

  if (type === 'login') {
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found with this mobile number",
      });
    }
  } else if (type === 'register') {
    if (seller) {
      return res.status(409).json({
        success: false,
        message: "Seller already exists with this mobile number. Please login.",
      });
    }
  }

  // Send OTP - for both login and register, always use default OTP for now
  const result = await sendOTPService(mobile, "Seller", true);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Verify OTP and login seller
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, otp, type = 'login' } = req.body;

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
  const isValid = await verifyOTPService(mobile, otp, "Seller");
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // For registration, we just confirm verification and don't need to find a seller or generate a token
  if (type === 'register') {
    return res.status(200).json({
      success: true,
      message: "Mobile number verified successfully",
    });
  }

  // For login, find seller and generate token
  const seller = await Seller.findOne({ mobile }).select("-password");
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found",
    });
  }

  // Generate JWT token
  const token = generateToken(seller._id.toString(), "Seller");

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: seller._id,
        sellerName: seller.sellerName,
        mobile: seller.mobile,
        email: seller.email,
        storeName: seller.storeName,
        status: seller.status,
        logo: seller.logo,
        address: seller.address,
        city: seller.city,
      },
    },
  });
});

/**
 * Register new seller
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    sellerName,
    mobile,
    email,
    storeName,
    categories,
    address,
    city,
    searchLocation,
    serviceRadiusKm,
    latitude,
    longitude,
    idProof,
    profile,
    fssaiLicNo,
    workingHours
  } = req.body;

  // Validation
  if (
    !sellerName ||
    !mobile ||
    !email ||
    !storeName ||
    !categories || categories.length === 0 ||
    !address ||
    !workingHours || !workingHours.open || !workingHours.close || !workingHours.workingDays
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Parse coordinates
  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;

  // Check if seller already exists
  const existingSeller = await Seller.findOne({
    $or: [{ mobile }, { email }],
  });

  if (existingSeller) {
    return res.status(409).json({
      success: false,
      message: "Seller already exists with this mobile or email",
    });
  }

  // Create GeoJSON location point [longitude, latitude]
  const location = (lng && lat) ? {
    type: 'Point' as const,
    coordinates: [lng, lat],
  } : undefined;

  // Create new seller
  const seller = await Seller.create({
    sellerName,
    mobile,
    email,
    storeName,
    category: categories[0],
    categories,
    address,
    city,
    searchLocation,
    latitude,
    longitude,
    location,
    serviceRadiusKm: parseFloat(serviceRadiusKm) || 10,
    idProof,
    profile,
    fssaiLicNo,
    workingHours,
    status: "Pending",
    commission: 0,
    balance: 0,
    isShopOpen: false,
    requireProductApproval: false,
    viewCustomerDetails: false
  });

  // Generate token
  const token = generateToken(seller._id.toString(), "Seller");

  return res.status(201).json({
    success: true,
    message: "Seller registered successfully. Awaiting admin approval.",
    data: {
      token,
      user: {
        id: seller._id,
        sellerName: seller.sellerName,
        mobile: seller.mobile,
        email: seller.email,
        storeName: seller.storeName,
        status: seller.status,
      },
    },
  });
});

/**
 * Get seller's profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;

  const seller = await Seller.findById(sellerId).select("-password");
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: seller,
  });
});

/**
 * Update seller's profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const updates = req.body;

  // Prevent updating sensitive fields directly
  const restrictedFields = ["password", "mobile", "email", "status", "balance"];
  restrictedFields.forEach((field) => delete updates[field]);

  // Handle location update (convert lat/lng to GeoJSON)
  if (updates.latitude && updates.longitude) {
    const latitude = parseFloat(updates.latitude);
    const longitude = parseFloat(updates.longitude);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      // Update GeoJSON location for geospatial queries
      updates.location = {
        type: 'Point',
        coordinates: [longitude, latitude], // MongoDB GeoJSON: [longitude, latitude]
      };
      // Ensure string fields are also synchronized
      updates.latitude = latitude.toString();
      updates.longitude = longitude.toString();
    }
  }

  // Handle serviceRadiusKm update
  if (updates.serviceRadiusKm !== undefined && updates.serviceRadiusKm !== null && updates.serviceRadiusKm !== '') {
    const radius = typeof updates.serviceRadiusKm === 'string'
      ? parseFloat(updates.serviceRadiusKm)
      : Number(updates.serviceRadiusKm);

    if (!isNaN(radius) && radius >= 0.1 && radius <= 100) {
      updates.serviceRadiusKm = radius; // Ensure it's saved as a number
    } else {
      return res.status(400).json({
        success: false,
        message: "Service radius must be between 0.1 and 100 kilometers",
      });
    }
  } else if (updates.serviceRadiusKm === '' || updates.serviceRadiusKm === null) {
    // If empty string or null is sent, remove it from updates to keep existing value
    delete updates.serviceRadiusKm;
  }

  const seller = await Seller.findByIdAndUpdate(sellerId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: seller,
  });
});

/**
 * Toggle shop status (Open/Close)
 */
export const toggleShopStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Handle undefined case - if isShopOpen is undefined, default to true (open) then toggle to false
    // This ensures backward compatibility with sellers created before this field was added
    if (seller.isShopOpen === undefined) {
      seller.isShopOpen = false; // Toggle from default "open" to "closed"
    } else {
      seller.isShopOpen = !seller.isShopOpen; // Normal toggle
    }

    // Fix invalid GeoJSON location objects
    // MongoDB requires that if location.type is "Point", coordinates must be a valid array
    if (seller.location && seller.location.type === 'Point') {
      if (!seller.location.coordinates || !Array.isArray(seller.location.coordinates) || seller.location.coordinates.length !== 2) {
        // Invalid location object - remove it to prevent validation error
        seller.location = undefined;
      }
    }

    await seller.save();

    return res.status(200).json({
      success: true,
      message: `Shop is now ${seller.isShopOpen ? "Open" : "Closed"}`,
      data: { isShopOpen: seller.isShopOpen },
    });
  }
);
