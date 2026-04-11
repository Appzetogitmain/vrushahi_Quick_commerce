import { Router } from "express";
import { getSellerStoreDetails } from "../modules/customer/controllers/customerStoreController";

const router = Router();

// Public routes for store details
router.get("/:sellerId", getSellerStoreDetails);

export default router;
