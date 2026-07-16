import { Router } from "express";
import { getSellerCustomers } from "../modules/seller/controllers/sellerCustomerController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// Get seller's customers
router.get("/customers", authenticate, requireUserType("Seller"), getSellerCustomers);

export default router;
