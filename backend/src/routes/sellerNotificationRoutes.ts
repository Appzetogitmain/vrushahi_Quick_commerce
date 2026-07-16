import { Router } from "express";
import * as sellerNotificationController from "../modules/seller/controllers/sellerNotificationController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// Notifications
router.get("/notifications", authenticate, requireUserType("Seller"), sellerNotificationController.getNotifications);
router.put("/notifications/:id/read", authenticate, requireUserType("Seller"), sellerNotificationController.markNotificationRead);
router.patch("/notifications/mark-read", authenticate, requireUserType("Seller"), sellerNotificationController.markMultipleAsRead);

export default router;
