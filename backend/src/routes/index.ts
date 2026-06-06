import { Router } from "express";
import adminAuthRoutes from "./adminAuthRoutes";
import sellerAuthRoutes from "./sellerAuthRoutes";
import dashboardRoutes from "./dashboardRoutes";
import customerAuthRoutes from "./customerAuthRoutes";
import deliveryRoutes from "./deliveryRoutes";
import deliveryAuthRoutes from "./deliveryAuthRoutes";

// ... (other imports)
import { authenticate, requireUserType } from "../middleware/auth";
import customerRoutes from "./customerRoutes";
import sellerRoutes from "./sellerRoutes";
import uploadRoutes from "./uploadRoutes";
import productRoutes from "./productRoutes";
import headerCategoryRoutes from "./headerCategoryRoutes";
import categoryRoutes from "./categoryRoutes";
import orderRoutes from "./orderRoutes";
import fcmTokenRoutes from "./fcmTokenRoutes";
import returnRoutes from "./returnRoutes";
import reportRoutes from "./reportRoutes";
import adminWithdrawalRoutes from "./adminWithdrawalRoutes";
import deliveryWalletRoutes from "./deliveryWalletRoutes";
import sellerWalletRoutes from "./sellerWalletRoutes";
import sellerFAQRoutes from "./sellerFAQRoutes";
import sellerCustomerRoutes from "./sellerCustomerRoutes";
import sellerNotificationRoutes from "./sellerNotificationRoutes";
import taxRoutes from "./taxRoutes";
import customerProductRoutes from "./customerProductRoutes";
import customerCategoryRoutes from "./customerCategoryRoutes";
import customerCouponRoutes from "./customerCouponRoutes";
import customerAddressRoutes from "./customerAddressRoutes";
import customerHomeRoutes from "./customerHomeRoutes";
import customerCartRoutes from "./customerCartRoutes";
import wishlistRoutes from "./wishlistRoutes";
import customerStoreRoutes from "./customerStoreRoutes";
import productReviewRoutes from "./productReviewRoutes";
import adminRoutes from "./adminRoutes";
import customerTrackingRoutes from "../modules/customer/routes/trackingRoutes";
import deliveryTrackingRoutes from "../modules/delivery/routes/trackingRoutes";
import customerBannerRoutes from "./customerBannerRoutes";
import paymentRoutes from "./paymentRoutes";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderNotes,
  createReturnRequest,
} from "../modules/customer/controllers/customerOrderController";

import policyRoutes from "./policyRoutes";

const router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.use("/auth/admin", adminAuthRoutes);
router.use("/auth/seller", sellerAuthRoutes);
router.use("/auth/customer", customerAuthRoutes);
router.use("/auth/delivery", deliveryAuthRoutes);

// FCM Token Routes
router.use("/fcm-tokens", fcmTokenRoutes);

// Delivery routes (protected)
router.use(
  "/delivery",
  authenticate,
  requireUserType("Delivery"),
  deliveryRoutes
);
router.use(
  "/delivery",
  authenticate,
  requireUserType("Delivery"),
  deliveryTrackingRoutes
);
router.use(
  "/delivery/wallet",
  deliveryWalletRoutes
);

// Customer routes - Specific routes MUST be registered before general /customer route
// to prevent Express from matching the broader route first
router.use("/customer/products", customerProductRoutes);
router.use("/customer/categories", customerCategoryRoutes);
router.use("/customer/coupons", customerCouponRoutes);
router.use("/customer/addresses", customerAddressRoutes);
router.use("/customer/home", customerHomeRoutes);
router.use("/customer/cart", customerCartRoutes);
router.use("/customer/stores", customerStoreRoutes);
router.use("/customer/wishlist", wishlistRoutes);
router.use("/customer/reviews", productReviewRoutes);

// Customer orders route - direct registration to avoid module loading issue
console.log("🔥 REGISTERING CUSTOMER ORDER ROUTES");
router.post(
  "/customer/orders",
  (_req, _res, next) => {
    console.log("✅ POST /customer/orders ROUTE MATCHED!");
    next();
  },
  authenticate,
  requireUserType("Customer"),
  createOrder
);
router.get("/customer/orders", authenticate, requireUserType("Customer"), getMyOrders);
router.get("/customer/orders/:id", authenticate, requireUserType("Customer"), getOrderById);
router.post("/customer/orders/:id/cancel", authenticate, requireUserType("Customer"), cancelOrder);
router.patch("/customer/orders/:id/notes", authenticate, requireUserType("Customer"), updateOrderNotes);
router.post("/customer/orders/:id/items/:itemId/return", authenticate, requireUserType("Customer"), createReturnRequest);

// Tracking routes
router.use("/customer", customerTrackingRoutes);

// General customer profile/location routes (moved here to avoid interception)
router.use("/customer", customerRoutes);

// Payment routes
router.use("/payment", paymentRoutes);

// Seller dashboard routes
router.use("/seller/dashboard", dashboardRoutes);
console.log("Is sellerCustomerRoutes defined?", !!sellerCustomerRoutes);
router.use("/seller", sellerCustomerRoutes);
router.use("/seller", sellerNotificationRoutes);

// Seller management routes (protected, admin only)
router.use("/sellers", sellerRoutes);

// Public banner routes (no authentication required)
router.use("/banners", customerBannerRoutes);

// Admin routes (protected, admin only)
router.use("/admin", adminRoutes);
router.use("/admin", adminWithdrawalRoutes);

// Upload routes (protected)
router.use("/upload", uploadRoutes);

// Product routes (protected, seller only)
router.use("/products", productRoutes);

// Category routes (protected, seller/admin)
router.use("/categories", categoryRoutes);

// Header Category Routes
router.use("/header-categories", headerCategoryRoutes);

// Public policy routes
router.use("/policies", policyRoutes);

// Order routes (protected, seller only)
router.use("/orders", orderRoutes);

// Return routes (protected, seller only)
router.use("/returns", returnRoutes);

// Report routes (protected, seller only)
router.use("/seller/reports", reportRoutes);

// Wallet routes (protected, seller only)
router.use("/seller/wallet", sellerWalletRoutes);

// FAQ routes (protected, seller only)
router.use("/seller/faqs", sellerFAQRoutes);

// Tax routes (protected, seller/admin)
router.use("/seller/taxes", taxRoutes);

// Add more routes here
// router.use('/users', userRoutes);

export default router;
