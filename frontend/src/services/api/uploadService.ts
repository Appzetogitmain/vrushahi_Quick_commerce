import api from "./config";

// Backend server base URL — used to convert relative paths (/uploads/...) to full URLs
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string || "http://localhost:9000/api/v1")
    .replace(/\/api\/v\d+\/?$/, "");

export interface UploadResult {
  /** Relative path stored in DB, e.g. /uploads/products/abc.webp */
  url: string;
  /** Same as url */
  secureUrl: string;
  /** Relative path — used as delete key */
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface UploadResponse {
  success: boolean;
  data: UploadResult | UploadResult[];
  message?: string;
}

/**
 * Convert a relative upload path (e.g. /uploads/products/file.webp)
 * to a full URL using the backend base URL.
 * Pass-through if already a full URL (http/https).
 */
export function getImageUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path}`;
}

/**
 * Upload a single image via backend — returns UploadResult with relative path
 */
export async function uploadImage(
  file: File,
  folder?: string
): Promise<UploadResult> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  formData.append("image", file);

  const response = await api.post<UploadResponse>("/upload/image", formData);

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data[0]
      : response.data.data;
  }

  throw new Error(response.data.message || "Failed to upload image");
}

/**
 * Generic upload function (used by newer components)
 */
export async function uploadFile(
  file: File,
  folder?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  formData.append("image", file);

  const response = await api.post<UploadResponse>("/upload/image", formData);
  return response.data;
}

/**
 * Upload multiple images via backend
 */
export async function uploadImages(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  files.forEach((file) => formData.append("images", file));

  const response = await api.post<UploadResponse>("/upload/images", formData);

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];
  }

  throw new Error(response.data.message || "Failed to upload images");
}

/**
 * Upload a document (image or PDF) via backend
 */
export async function uploadDocument(
  file: File,
  folder?: string
): Promise<UploadResult> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  formData.append("document", file);

  const response = await api.post<UploadResponse>("/upload/document", formData);

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data[0]
      : response.data.data;
  }

  throw new Error(response.data.message || "Failed to upload document");
}

/**
 * Public endpoint for uploading documents (e.g., during signup — no auth required)
 */
export async function uploadDocumentPublic(
  file: File,
  folder?: string
): Promise<UploadResult> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  formData.append("document", file);

  const response = await api.post<UploadResponse>(
    "/upload/document-public",
    formData
  );

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data[0]
      : response.data.data;
  }

  throw new Error(response.data.message || "Failed to upload document");
}

/**
 * Upload multiple documents via backend
 */
export async function uploadDocuments(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  files.forEach((file) => formData.append("documents", file));

  const response = await api.post<UploadResponse>("/upload/documents", formData);

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];
  }

  throw new Error(response.data.message || "Failed to upload documents");
}

/**
 * Delete a file by its relative path (publicId), e.g. /uploads/products/file.webp
 */
export async function deleteImage(publicId: string): Promise<void> {
  // Strip leading slash for the URL param
  const cleanId = publicId.startsWith("/") ? publicId.slice(1) : publicId;
  const response = await api.delete<{ success: boolean; message?: string }>(
    `/upload/${cleanId}`
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete file");
  }
}
