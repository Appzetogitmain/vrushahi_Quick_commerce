import { Router } from "express";
import { getSellerCustomers } from "../modules/seller/controllers/sellerCustomerController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// All routes require authentication and seller user type
router.use(authenticate);
router.use(requireUserType("Seller"));

// Get seller's customers
router.get("/customers", getSellerCustomers);

export default router;
