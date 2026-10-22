import { Router, Request, Response } from "express";
import { authenticate, requireUserType } from "../middleware/auth";
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadMultipleDocuments,
  handleUploadError,
} from "../middleware/upload";
import {
  uploadImageFromBuffer,
  uploadDocumentFromBuffer,
  deleteImage,
} from "../services/localUploadService";
import { UPLOAD_DIRS } from "../config/uploadPaths";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// ─── Public routes (no auth — Registration / Onboarding) ─────────────────────

/**
 * POST /api/v1/upload/image-public
 * Public endpoint for uploading images (e.g., store logo during signup)
 */
router.post(
  "/image-public",
  uploadSingleImage.single("image"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const result = await uploadImageFromBuffer(
      file.buffer,
      { folder: UPLOAD_DIRS.SELLER_DOCUMENTS, resourceType: "image" },
      file.originalname
    );

    return res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/upload/document-public
 * Public endpoint for uploading documents (e.g., Aadhar, Photo during signup)
 */
router.post(
  "/document-public",
  uploadDocument.single("document"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    console.log("[Upload] POST /document-public - file:", file
      ? { fieldname: file.fieldname, originalname: file.originalname, mimetype: file.mimetype, size: file.size }
      : "No file"
    );

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No document file provided",
      });
    }

    const folder = req.body.folder || UPLOAD_DIRS.SELLER_DOCUMENTS;
    const isImage = file.mimetype.startsWith("image/");
    const resourceType: "image" | "raw" = isImage ? "image" : "raw";
    console.log("[Upload] Resource Type:", resourceType, "→ folder:", folder);

    try {
      const result = await uploadDocumentFromBuffer(
        file.buffer,
        { folder, resourceType },
        file.originalname
      );
      console.log("[Upload] Saved:", result.publicId);
      return res.status(200).json({ success: true, data: result });
    } catch (uploadError: any) {
      console.error("[Upload] Error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Upload failed",
        error: uploadError.message,
      });
    }
  })
);

// ─── Protected routes (require auth) ─────────────────────────────────────────
router.use(authenticate);

/**
 * POST /api/v1/upload/image
 * Upload a single image (Admin / Seller / Customer / Delivery)
 */
router.post(
  "/image",
  requireUserType("Admin", "Seller", "Customer", "Delivery"),
  uploadSingleImage.single("image"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const folder = (req.body.folder as string) || UPLOAD_DIRS.PRODUCTS;
    const result = await uploadImageFromBuffer(
      file.buffer,
      { folder, resourceType: "image" },
      file.originalname
    );

    return res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/upload/images
 * Upload multiple images (max 10)
 */
router.post(
  "/images",
  requireUserType("Admin", "Seller", "Customer", "Delivery"),
  uploadMultipleImages.array("images", 10),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files provided",
      });
    }

    const folder = (req.body.folder as string) || UPLOAD_DIRS.PRODUCTS;

    const results = await Promise.all(
      files.map((file) =>
        uploadImageFromBuffer(
          file.buffer,
          { folder, resourceType: "image" },
          file.originalname
        )
      )
    );

    return res.status(200).json({ success: true, data: results });
  })
);

/**
 * POST /api/v1/upload/document
 * Upload a single document (image or PDF) — determines folder from userType
 */
router.post(
  "/document",
  requireUserType("Admin", "Seller", "Delivery", "Customer"),
  uploadDocument.single("document"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No document file provided",
      });
    }

    // Determine folder from userType
    let folder: string = UPLOAD_DIRS.SELLER_DOCUMENTS;
    const userType = (req as any).user?.userType;
    if (userType === "Delivery") folder = UPLOAD_DIRS.DELIVERY_DOCUMENTS;
    else if (userType === "Seller") folder = UPLOAD_DIRS.SELLER_DOCUMENTS;
    else if (userType === "Customer") folder = UPLOAD_DIRS.PRODUCTS;

    const isImage = file.mimetype.startsWith("image/");
    const resourceType: "image" | "raw" = isImage ? "image" : "raw";

    const result = await uploadDocumentFromBuffer(
      file.buffer,
      { folder, resourceType },
      file.originalname
    );

    return res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/upload/documents
 * Upload multiple documents (max 5)
 */
router.post(
  "/documents",
  requireUserType("Admin", "Seller", "Delivery", "Customer"),
  uploadMultipleDocuments.array("documents", 5),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No document files provided",
      });
    }

    // Determine folder from userType
    let folder: string = UPLOAD_DIRS.SELLER_DOCUMENTS;
    const userType = (req as any).user?.userType;
    if (userType === "Delivery") folder = UPLOAD_DIRS.DELIVERY_DOCUMENTS;
    else if (userType === "Seller") folder = UPLOAD_DIRS.SELLER_DOCUMENTS;
    else if (userType === "Customer") folder = UPLOAD_DIRS.PRODUCTS;

    const results = await Promise.all(
      files.map((file) => {
        const isImage = file.mimetype.startsWith("image/");
        const resourceType: "image" | "raw" = isImage ? "image" : "raw";
        return uploadDocumentFromBuffer(
          file.buffer,
          { folder, resourceType },
          file.originalname
        );
      })
    );

    return res.status(200).json({ success: true, data: results });
  })
);

/**
 * DELETE /api/v1/upload/:publicId
 * Delete a file by its relative path publicId
 * publicId is URL-encoded, e.g. %2Fuploads%2Fproducts%2Ffile.webp
 */
router.delete(
  "/*",
  requireUserType("Admin", "Seller"),
  asyncHandler(async (req: Request, res: Response) => {
    // Extract full path after /upload/ — handles nested paths like /uploads/products/file.webp
    const publicId = "/" + req.params[0];

    if (!publicId || publicId === "/") {
      return res.status(400).json({
        success: false,
        message: "File path (publicId) is required",
      });
    }

    await deleteImage(publicId);

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  })
);

export default router;
