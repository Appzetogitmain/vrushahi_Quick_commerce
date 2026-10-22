import multer from "multer";
import { Request } from "express";


// ─── File Size Limits ────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;    // 10 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// ─── Memory storage (buffers passed to localUploadService for Sharp processing)
// We keep memory storage so the buffer can be passed through Sharp before
// writing to disk inside localUploadService.
const storage = multer.memoryStorage();

// ─── File filters ─────────────────────────────────────────────────────────────
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      )
    );
  }
};

const documentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`
      )
    );
  }
};

// ─── Multer instances ─────────────────────────────────────────────────────────

/** Single image upload (max 10 MB) */
export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: imageFileFilter,
});

/** Multiple image uploads (max 10 MB each) */
export const uploadMultipleImages = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: imageFileFilter,
});

/** Single document upload — image or PDF (max 10 MB) */
export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: documentFileFilter,
});

/** Multiple document uploads (max 10 MB each) */
export const uploadMultipleDocuments = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: documentFileFilter,
});

// ─── Error handler ────────────────────────────────────────────────────────────

export const handleUploadError = (
  err: any,
  _req: Request,
  res: any,
  _next: any
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds the 10 MB maximum allowed limit",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field",
      });
    }
  }

  if (err?.message?.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  _next(err);
};
