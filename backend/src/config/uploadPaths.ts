import path from "path";
import fs from "fs";

// Base upload directory — relative to backend process.cwd()
export const BASE_UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Upload folder constants (mirrors old CLOUDINARY_FOLDERS keys)
export const UPLOAD_DIRS = {
  PRODUCTS: "uploads/products",
  PRODUCT_GALLERY: "uploads/products/gallery",
  CATEGORIES: "uploads/categories",
  SUBCATEGORIES: "uploads/subcategories",
  COUPONS: "uploads/coupons",
  SELLERS: "uploads/sellers",
  SELLER_PROFILE: "uploads/sellers/profile",
  SELLER_DOCUMENTS: "uploads/sellers/documents",
  DELIVERY: "uploads/delivery",
  DELIVERY_DOCUMENTS: "uploads/delivery/documents",
  STORES: "uploads/stores",
  USERS: "uploads/users",
  BANNERS: "uploads/banners",
  BRANDS: "uploads/brands",
  HOME_SECTIONS: "uploads/home-sections",
} as const;

export type UploadDir = (typeof UPLOAD_DIRS)[keyof typeof UPLOAD_DIRS];

/**
 * Ensure all upload directories exist.
 * Called once at server startup.
 */
export function ensureUploadDirs(): void {
  Object.values(UPLOAD_DIRS).forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
}

/**
 * Get the absolute filesystem path for a given relative upload dir.
 * e.g. "uploads/products" → "d:/project/backend/uploads/products"
 */
export function getAbsoluteUploadPath(relativeDir: string): string {
  return path.join(process.cwd(), relativeDir);
}
