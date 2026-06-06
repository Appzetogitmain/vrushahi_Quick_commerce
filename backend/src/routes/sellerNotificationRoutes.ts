import { Router } from "express";
import * as sellerNotificationController from "../modules/seller/controllers/sellerNotificationController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// All notification routes require authentication and seller role
router.use(authenticate);
router.use(requireUserType("Seller"));

// Notifications
router.get("/notifications", sellerNotificationController.getNotifications);
router.put("/notifications/:id/read", sellerNotificationController.markNotificationRead);
router.patch("/notifications/mark-read", sellerNotificationController.markMultipleAsRead);

export default router;
