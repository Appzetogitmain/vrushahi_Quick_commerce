import { Router } from "express";
import { authenticate, requireUserType } from "../middleware/auth";
import * as subscriptionController from "../modules/seller/controllers/sellerSubscriptionController";

const router = Router();

// Publicly accessible for registration
router.get("/plans", subscriptionController.getActiveSubscriptionPlans);

// Private seller routes
router.use(authenticate);
router.use(requireUserType("Seller"));

router.get("/my", subscriptionController.getMySubscription);
router.post("/create-payment", subscriptionController.createPaymentOrder);
router.post("/verify-payment", subscriptionController.verifyPayment);
router.post("/switch-to-commission", subscriptionController.switchModelToCommission);
router.post("/acknowledge-expiry", subscriptionController.acknowledgeExpiry);

export default router;
