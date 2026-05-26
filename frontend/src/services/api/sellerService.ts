import api from "./config";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Seller {
  _id: string;
  sellerName: string;
  storeName: string;
  mobile: string;
  email: string;
  logo?: string;
  balance: number;
  commission: number;
  categories: string[];
  status: "Approved" | "Pending" | "Rejected";
  rejectionReason?: string;
  storeImage?: string;
  category?: string;
  address?: string;
  city?: string;
  serviceableArea?: string;
  panCard?: string;
  taxName?: string;
  taxNumber?: string;
  searchLocation?: string;
  latitude?: string;
  longitude?: string;
  serviceRadiusKm?: number;
  accountName?: string;
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  ifsc?: string;
  profile?: string;
  idProof?: string;
  addressProof?: string;
  fssaiLicNo?: string;
  businessLicense?: string;
  workingHours?: {
    open: string;
    close: string;
    workingDays: string[];
  };
  requireProductApproval?: boolean;
  viewCustomerDetails?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetAllSellersParams {
  status?: "Approved" | "Pending" | "Rejected";
  search?: string;
}

export interface SellerFAQ {
  _id: string;
  question: string;
  answer: string;
  isActive: boolean;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSellerData {
  sellerName: string;
  storeName: string;
  email: string;
  mobile: string;
  password: string;
  category: string;
  address?: string;
  city: string;
  serviceableArea: string;
  searchLocation?: string;
  latitude?: string;
  longitude?: string;
  serviceRadiusKm?: number;
  panCard?: string;
  taxName?: string;
  taxNumber?: string;
  accountName?: string;
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  ifsc?: string;
  profile?: string;
  idProof?: string;
  addressProof?: string;
  requireProductApproval: boolean;
  viewCustomerDetails: boolean;
  commission: number;
}

/**
 * Create a new seller
 */
export const createSeller = async (
  data: CreateSellerData
): Promise<ApiResponse<Seller>> => {
  const response = await api.post<ApiResponse<Seller>>("/sellers", data);
  return response.data;
};

/**
 * Get all sellers
 */
export const getAllSellers = async (
  params?: GetAllSellersParams
): Promise<ApiResponse<Seller[]>> => {
  const response = await api.get<ApiResponse<Seller[]>>("/sellers", { params });
  return response.data;
};

/**
 * Get seller by ID
 */
export const getSellerById = async (
  id: string
): Promise<ApiResponse<Seller>> => {
  const response = await api.get<ApiResponse<Seller>>(`/sellers/${id}`);
  return response.data;
};

/**
 * Update seller status
 */
export const updateSellerStatus = async (
  id: string,
  status: "Approved" | "Pending" | "Rejected",
  rejectionReason?: string
): Promise<ApiResponse<Seller>> => {
  const response = await api.patch<ApiResponse<Seller>>(
    `/sellers/${id}/status`,
    { status, rejectionReason }
  );
  return response.data;
};

/**
 * Update seller details
 */
export const updateSeller = async (
  id: string,
  data: Partial<Seller>
): Promise<ApiResponse<Seller>> => {
  const response = await api.put<ApiResponse<Seller>>(`/sellers/${id}`, data);
  return response.data;
};

/**
 * Delete seller
 */
export const deleteSeller = async (id: string): Promise<ApiResponse<void>> => {
  const response = await api.delete<ApiResponse<void>>(`/sellers/${id}`);
  return response.data;
};

/**
 * Get Seller FAQs
 */
export const getSellerFAQs = async (params?: { search?: string, role?: string }): Promise<ApiResponse<SellerFAQ[]>> => {
  const response = await api.get<ApiResponse<SellerFAQ[]>>("/seller/faqs", { params });
  return response.data;
};

export interface SellerCustomer {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  profile?: string;
  totalOrders: number;
  totalSpent: number;
}

/**
 * Get Seller Customers
 */
export const getSellerCustomers = async (): Promise<ApiResponse<SellerCustomer[]>> => {
  const response = await api.get<ApiResponse<SellerCustomer[]>>("/seller/customers");
  return response.data;
};

