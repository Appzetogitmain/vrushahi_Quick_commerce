import { Router } from "express";
import {
  getAllSellers,
  getSellerById,
  updateSellerStatus,
  updateSeller,
  deleteSeller,
  blockSeller,
  unblockSeller,
} from "../modules/seller/controllers/sellerController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// All routes require authentication and admin user type
router.use(authenticate);
router.use(requireUserType("Admin"));

// Get all sellers
router.get("/", getAllSellers);

// Get seller by ID
router.get("/:id", getSellerById);

// Update seller status
router.patch("/:id/status", updateSellerStatus);

// Update seller details
router.put("/:id", updateSeller);

// Delete seller
router.delete("/:id", deleteSeller);

// Block seller
router.put("/:id/block", blockSeller);

// Unblock seller
router.put("/:id/unblock", unblockSeller);

export default router;
