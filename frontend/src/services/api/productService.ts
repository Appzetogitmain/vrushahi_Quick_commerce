import api from "./config";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductVariation {
  _id?: string;
  name?: string; // Mapped from title if needed, or direct
  value?: string;
  title?: string; // Frontend uses title
  color?: string;
  size?: string;
  price: number;
  discPrice: number;
  stock: number;
  status: "Available" | "Sold out" | "In stock"; // Added In stock
  sku?: string;
  image?: string;
  imageFile?: File | null;
  imagePreview?: string;
}

export interface Product {
  _id: string;
  productName: string;
  seller: string | any; // Updated to allow populated object
  headerCategoryId?: string | any; // Updated to allow populated object
  category?: string | any; // Updated to allow populated object
  subcategory?: string | any;
  subSubCategory?: string | any; // Added subSubCategory
  brand?: string | any; // Updated
  publish: boolean;
  popular: boolean;
  stock: number;
  price: number;
  discPrice: number;
  dealOfDay: boolean;
  seoTitle?: string;
  seoKeywords?: string;
  seoImageAlt?: string;
  seoDescription?: string;
  smallDescription?: string;
  tags: string[];
  manufacturer?: string;
  madeIn?: string;
  tax?: string | any; // Updated
  isReturnable: boolean;
  maxReturnDays?: number;
  totalAllowedQuantity: number;
  fssaiLicNo?: string;
  mainImageUrl?: string;
  mainImage?: string; // Mapped directly from Product model
  galleryImageUrls?: string[]; // Frontend naming
  galleryImages?: string[]; // Backend naming
  variations: ProductVariation[];
  variationType?: string;
  createdAt?: string;
  updatedAt?: string;
  // New Fields for Modern Dashboard
  costPrice?: number;
  minOrderQuantity?: number;
  maxOrderLimit?: number;
  sku?: string;
  drugLicNo?: string;
  storageInstructions?: string;
  cutType?: string;
  freshnessLevel?: string;
  prescriptionRequired?: boolean;
  warranty?: string;
  specs?: any;
  sizeChartUrl?: string;
  shelfLife?: string;
  attributes?: any;
  description?: string;
  // Fallback for old fields if any legacy code uses them
  sellerId?: string;
  categoryId?: string;
  subcategoryId?: string;
  brandId?: string;
  taxId?: string;
  // Shop by Store fields (Removed)
}

export interface CreateProductData {
  productName: string;
  headerCategoryId?: string;
  categoryId?: string;
  subcategoryId?: string;
  subSubCategoryId?: string;
  brandId?: string;
  publish: boolean;
  popular: boolean;
  dealOfDay: boolean;
  seoTitle?: string;
  seoKeywords?: string;
  seoImageAlt?: string;
  seoDescription?: string;
  smallDescription?: string;
  description?: string;
  tags?: string[];
  manufacturer?: string;
  madeIn?: string;
  taxId?: string;
  isReturnable: boolean;
  maxReturnDays?: number;
  totalAllowedQuantity: number;
  fssaiLicNo?: string;
  mainImageUrl?: string;
  galleryImageUrls?: string[];
  galleryImages?: string[];
  variations: ProductVariation[];
  variationType?: string;
  // New Fields
  costPrice?: number;
  minOrderQuantity?: number;
  maxOrderLimit?: number;
  sku?: string;
  drugLicNo?: string;
  storageInstructions?: string;
  cutType?: string;
  freshnessLevel?: string;
  prescriptionRequired?: boolean;
  warranty?: string;
  specs?: any;
  sizeChartUrl?: string;
  shelfLife?: string;
  attributes?: any;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface GetProductsParams {
  search?: string;
  category?: string;
  status?: "published" | "unpublished" | "popular" | "dealOfDay";
  stock?: "inStock" | "outOfStock";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Create a new product
 */
export const createProduct = async (
  data: CreateProductData
): Promise<ApiResponse<Product>> => {
  const response = await api.post<ApiResponse<Product>>("/products", data);
  return response.data;
};

/**
 * Get seller's products with filters
 */
export const getProducts = async (
  params?: GetProductsParams
): Promise<ApiResponse<Product[]>> => {
  const response = await api.get<ApiResponse<Product[]>>("/products", {
    params,
  });
  return response.data;
};

/**
 * Get product by ID
 */
export const getProductById = async (
  id: string
): Promise<ApiResponse<Product>> => {
  const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return response.data;
};

/**
 * Update product
 */
export const updateProduct = async (
  id: string,
  data: UpdateProductData
): Promise<ApiResponse<Product>> => {
  const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
  return response.data;
};

/**
 * Update stock for a product variation
 */
export const updateStock = async (
  productId: string,
  variationId: string,
  stock: number,
  status?: "Available" | "Sold out"
): Promise<ApiResponse<Product>> => {
  const response = await api.patch<ApiResponse<Product>>(
    `/products/${productId}/variations/${variationId}/stock`,
    { stock, status }
  );
  return response.data;
};

/**
 * Bulk update stock for multiple variations
 */
export const bulkUpdateStock = async (
  updates: { productId: string; variationId: string; stock: number }[]
): Promise<any> => {
  const response = await api.patch("/products/bulk-stock-update", { updates });
  return response.data;
};

/**
 * Delete product
 */
export const deleteProduct = async (id: string): Promise<ApiResponse<void>> => {
  const response = await api.delete<ApiResponse<void>>(`/products/${id}`);
  return response.data;
};

/**
 * Update product status (publish, popular, dealOfDay)
 */
export const updateProductStatus = async (
  id: string,
  status: { publish?: boolean; popular?: boolean; dealOfDay?: boolean }
): Promise<ApiResponse<Product>> => {
  const response = await api.patch<ApiResponse<Product>>(
    `/products/${id}/status`,
    status
  );
  return response.data;
};

export interface ProductSummary {
  total: number;
  published: number;
  draft: number;
}

export const getProductSummary = async (): Promise<ApiResponse<ProductSummary>> => {
  const response = await api.get('/products/summary');
  return response.data;
};
