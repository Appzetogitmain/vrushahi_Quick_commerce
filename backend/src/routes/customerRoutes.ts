import { Router } from "express";
import * as customerController from "../modules/customer/controllers/customerController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/policies", customerController.getPublicPolicies);
router.get("/config", customerController.getAppConfig);

// Get customer profile (protected route)
router.get("/profile", authenticate, customerController.getProfile);

// Update customer profile (protected route)
router.put("/profile", authenticate, customerController.updateProfile);

// Request delete OTP (protected route)
router.post("/profile/delete-otp", authenticate, customerController.sendDeleteOtp);

// Delete customer profile (protected route)
router.delete("/profile", authenticate, customerController.deleteAccount);

// Update customer location (protected route)
router.post("/location", authenticate, customerController.updateLocation);

// Get customer location (protected route)
router.get("/location", authenticate, customerController.getLocation);

export default router;
