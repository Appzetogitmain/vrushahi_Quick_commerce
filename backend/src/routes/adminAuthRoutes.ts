import { Router } from "express";
import * as adminAuthController from "../modules/admin/controllers/adminAuthController";
import { otpRateLimiter, loginRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Send OTP route
router.post("/send-otp", otpRateLimiter, adminAuthController.sendOTP);

// Verify OTP and login route (Legacy, if needed)
router.post("/verify-otp", loginRateLimiter, adminAuthController.verifyOTP);

// Email and Password login route
router.post("/login", loginRateLimiter, adminAuthController.loginWithEmail);

// Register route
router.post("/register", adminAuthController.register);

export default router;
