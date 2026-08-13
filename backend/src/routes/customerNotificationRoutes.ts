import { Router } from "express";
import * as customerNotificationController from "../modules/customer/controllers/customerNotificationController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// Customer Notifications — mounted at /customer/notifications in index.ts
router.get("/", authenticate, requireUserType("Customer"), customerNotificationController.getNotifications);
router.put("/:id/read", authenticate, requireUserType("Customer"), customerNotificationController.markNotificationRead);
router.patch("/mark-read", authenticate, requireUserType("Customer"), customerNotificationController.markMultipleAsRead);

export default router;
