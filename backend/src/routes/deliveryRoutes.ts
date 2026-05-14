import { Router } from "express";
import * as deliveryDashboardController from "../modules/delivery/controllers/deliveryDashboardController";
import * as deliveryOrderController from "../modules/delivery/controllers/deliveryOrderController";
import * as deliveryEarningController from "../modules/delivery/controllers/deliveryEarningController";
import { getProfile } from "../modules/delivery/controllers/deliveryAuthController";

import * as deliveryProfileController from "../modules/delivery/controllers/deliveryProfileController";
import * as deliveryNotificationController from "../modules/delivery/controllers/deliveryNotificationController";

const router = Router();

// Profile & Status
router.get("/profile", getProfile);
router.put("/profile", deliveryProfileController.updateProfile);
router.put("/profile/resubmit", deliveryProfileController.resubmitForApproval);
router.put("/status", deliveryProfileController.updateStatus);
router.put("/settings", deliveryProfileController.updateSettings);

// Notifications
router.get("/notifications", deliveryNotificationController.getNotifications);
router.put("/notifications/:id/read", deliveryNotificationController.markNotificationRead);

// Dashboard Stats
router.get("/dashboard/stats", deliveryDashboardController.getDashboardStats);

// Help & Support
router.get("/help", deliveryDashboardController.getHelpSupport);

// Orders
router.get("/orders/history", deliveryOrderController.getAllOrdersHistory);
router.get("/orders/today", deliveryOrderController.getTodayOrders);
router.get("/orders/pending", deliveryOrderController.getPendingOrders);
router.get("/orders/returns", deliveryOrderController.getReturnOrders);
router.get("/orders/:id", deliveryOrderController.getOrderDetails); // Specific order details
router.get("/orders/:id/seller-locations", deliveryOrderController.getSellerLocationsForOrder);
router.put("/orders/:id/status", deliveryOrderController.updateOrderStatus);
router.post("/orders/:id/send-delivery-otp", deliveryOrderController.sendDeliveryOtp);
router.post("/orders/:id/verify-delivery-otp", deliveryOrderController.verifyDeliveryOtpController);

// New proximity and pickup routes
router.post("/orders/:id/check-seller-proximity", deliveryOrderController.checkSellerProximity);
router.post("/orders/:id/send-pickup-otp", deliveryOrderController.sendSellerPickupOtp);
router.post("/orders/:id/confirm-seller-pickup", deliveryOrderController.confirmSellerPickup);
router.post("/orders/:id/check-customer-proximity", deliveryOrderController.checkCustomerProximity);

// New Payment Routes
router.post("/orders/:id/create-qr-payment", deliveryOrderController.createQrPayment);
router.post("/orders/:id/mark-cash-paid", deliveryOrderController.markCashPaid);

// Return Pickup Routes
router.post("/orders/return-pickup/:id/accept", deliveryOrderController.acceptReturnPickup);
router.post("/orders/return-pickup/:id/reject", deliveryOrderController.rejectReturnPickup);
router.get("/orders/return-pickup/:id", deliveryOrderController.getReturnPickupDetails);
router.post("/orders/return-pickup/:id/send-customer-otp", deliveryOrderController.sendCustomerReturnOtp);
router.post("/orders/return-pickup/:id/verify-customer-otp", deliveryOrderController.verifyCustomerReturnOtp);
router.post("/orders/return-pickup/:id/send-seller-otp", deliveryOrderController.sendSellerReturnOtp);
router.post("/orders/return-pickup/:id/verify-seller-otp", deliveryOrderController.verifySellerReturnOtp);

// Earnings
router.get("/earnings", deliveryEarningController.getEarningsHistory);

export default router;
