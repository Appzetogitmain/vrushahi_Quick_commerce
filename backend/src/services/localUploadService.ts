import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAbsoluteUploadPath, UPLOAD_DIRS } from "../config/uploadPaths";

// Conditionally import sharp — graceful fallback if not available
let sharp: any;
try {
  sharp = require("sharp");
} catch {
  console.warn("⚠️  sharp not available — images will be stored as-is without optimization");
}

// ===== Interfaces (same shape as old cloudinaryService) =====

export interface UploadResult {
  /** Relative path stored in DB, e.g. /uploads/products/abc123.webp */
  url: string;
  /** Same as url — used by frontend callers that reference secureUrl */
  secureUrl: string;
  /** Relative path — used as the delete key (publicId) */
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface UploadOptions {
  /** Relative upload dir, e.g. "uploads/products" */
  folder?: string;
  resourceType?: "image" | "raw" | "auto";
  /** Max width in px for image resize (default 1920) */
  maxWidth?: number;
  /** Sharp quality 1-100 (default 82) */
  quality?: number;
}

// ===== Helpers =====

/**
 * Generate a unique filename: timestamp + random hex + extension
 */
function generateFilename(originalName: string, ext: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  const safeName = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9]/g, "-")
    .slice(0, 30);
  return `${safeName}-${timestamp}-${random}${ext}`;
}

/**
 * Process image buffer with Sharp (WebP conversion + resize).
 * Falls back to original buffer if Sharp is unavailable.
 */
async function optimizeImage(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<{ data: Buffer; ext: string; format: string }> {
  if (!sharp) {
    return { data: buffer, ext: ".jpg", format: "jpeg" };
  }

  const maxWidth = options.maxWidth ?? 1920;
  const quality = options.quality ?? 82;

  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Only resize if wider than maxWidth
  const pipeline = metadata.width && metadata.width > maxWidth
    ? image.resize({ width: maxWidth, withoutEnlargement: true })
    : image;

  const data = await pipeline
    .webp({ quality })
    .toBuffer();

  return { data, ext: ".webp", format: "webp" };
}

/**
 * Save a buffer to disk and return the relative URL path stored in DB.
 */
async function saveBufferToDisk(
  buffer: Buffer,
  folder: string,
  originalName: string,
  isImage: boolean,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Ensure folder always goes into the uploads directory (legacy frontend passes "products" instead of "uploads/products")
  const actualFolder = folder.startsWith("uploads") ? folder : `uploads/${folder}`.replace(/\/\//g, "/");
  const absDir = getAbsoluteUploadPath(actualFolder);

  // Ensure directory exists
  if (!fs.existsSync(absDir)) {
    fs.mkdirSync(absDir, { recursive: true });
  }

  let fileBuffer = buffer;
  let ext = path.extname(originalName).toLowerCase() || ".jpg";
  let format = ext.replace(".", "");
  let width: number | undefined;
  let height: number | undefined;

  // Optimize images (convert to WebP)
  if (isImage && sharp) {
    try {
      const optimized = await optimizeImage(buffer, options);
      fileBuffer = optimized.data;
      ext = optimized.ext;
      format = optimized.format;

      // Get dimensions from optimized image
      const meta = await sharp(fileBuffer).metadata();
      width = meta.width;
      height = meta.height;
    } catch (err) {
      console.warn("⚠️  Image optimization failed, saving original:", err);
      fileBuffer = buffer;
    }
  }

  const filename = generateFilename(originalName, ext);
  const absFilePath = path.join(absDir, filename);

  // Write to disk
  fs.writeFileSync(absFilePath, fileBuffer);

  // Relative path for DB storage (no domain)
  const relativePath = `/${actualFolder}/${filename}`.replace(/\/\//g, "/");

  return {
    url: relativePath,
    secureUrl: relativePath,
    publicId: relativePath,
    width,
    height,
    format,
    bytes: fileBuffer.length,
  };
}

// ===== Public API (drop-in replacement for cloudinaryService) =====

/**
 * Upload a single image from buffer to local disk.
 * Converts to WebP with Sharp if available.
 */
export async function uploadImageFromBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
  originalName: string = "image.jpg"
): Promise<UploadResult> {
  const folder = options.folder || UPLOAD_DIRS.PRODUCTS;
  return saveBufferToDisk(buffer, folder, originalName, true, options);
}

/**
 * Upload a document (image or PDF) from buffer to local disk.
 * Images are optimized; PDFs are stored as-is.
 */
export async function uploadDocumentFromBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
  originalName: string = "document.pdf"
): Promise<UploadResult> {
  const folder = options.folder || UPLOAD_DIRS.SELLER_DOCUMENTS;
  const isImage = options.resourceType === "image" ||
    (!originalName.endsWith(".pdf") && options.resourceType !== "raw");
  return saveBufferToDisk(buffer, folder, originalName, isImage, options);
}

/**
 * Delete a file by its relative path (publicId).
 * Silently succeeds if file does not exist.
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    // publicId is a relative path like /uploads/products/file.webp
    const absPath = path.join(process.cwd(), publicId);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    console.warn(`⚠️  Could not delete file ${publicId}:`, err);
  }
}

/**
 * Delete multiple files by their relative paths.
 */
export async function deleteMultipleImages(publicIds: string[]): Promise<void> {
  await Promise.all(publicIds.map((id) => deleteImage(id)));
}
