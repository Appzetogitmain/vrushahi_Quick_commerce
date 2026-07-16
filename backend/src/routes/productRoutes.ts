import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  updateProductStatus,
  bulkUpdateStock,
  bulkUploadProducts,
  getProductSummary,
} from "../modules/seller/controllers/productController";
import { getBrands } from "../modules/admin/controllers/adminProductController";
import { authenticate, requireUserType } from "../middleware/auth";
import multer from "multer";

const router = Router();
const uploadExcel = multer({ storage: multer.memoryStorage() });

// All routes require authentication and seller/admin user type
router.use(authenticate);
router.use(requireUserType("Seller", "Admin"));

// Get all brands - sellers need this for product creation
router.get("/brands", getBrands);

// Bulk upload products (Must be before /:id to avoid treating bulk-upload as an ID)
router.post("/bulk-upload", uploadExcel.single("file"), bulkUploadProducts);

// Get product summary (Total, Published, Draft)
router.get("/summary", getProductSummary);

// Create product
router.post("/", createProduct);

// Get seller's products with filters
router.get("/", getProducts);

// Get product by ID
router.get("/:id", getProductById);

// Update product
router.put("/:id", updateProduct);

// Delete product
router.delete("/:id", deleteProduct);

// Update stock for a product variation
router.patch("/:id/variations/:variationId/stock", updateStock);

// Bulk update stock
router.patch("/bulk-stock-update", bulkUpdateStock);

// Update product status (publish, popular, dealOfDay)
router.patch("/:id/status", updateProductStatus);

export default router;
