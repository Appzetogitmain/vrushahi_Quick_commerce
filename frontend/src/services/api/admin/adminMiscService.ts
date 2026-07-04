import api from "../config";


import { ApiResponse } from "./types";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationDate: string;
  status: "Active" | "Inactive" | "Deleted";
  refCode?: string;
  walletAmount: number;
  totalOrders: number;
  totalSpent: number;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MiscReturnRequest {
  _id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  userName: string;
  sellerId: string;
  sellerName: string;
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  total: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Refunded" | "Completed";
  requestedAt: string;
  processedAt?: string;
  refundAmount?: number;
  adminNotes?: string;
  productCustody?: string;
  pickupStatus?: string;
  qcStatus?: string;
  qcNotes?: string;
  riderImages?: string[];
  customerOtpVerified?: boolean;
  sellerOtpVerified?: boolean;
  deliveryBoyName?: string;
  returnPickupFee?: number;
  riderPayoutProcessed?: boolean;
}

export interface HeaderCategory {
  _id: string;
  name: string;
  image?: string;
  order: number;
  isActive: boolean;
  categoryId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MiscHomeSection {
  _id: string;
  title: string;
  type: "banner" | "featured_products" | "categories" | "deals";
  content: any; // Flexible content based on type
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReturnRequestData {
  orderId: string;
  orderItemId: string;
  userId: string;
  reason: string;
  status?: "Pending" | "Approved" | "Rejected" | "Refunded";
}

export interface UpdateReturnRequestData {
  status?: "Pending" | "Approved" | "Rejected" | "Refunded" | "Completed";
  refundAmount?: number;
  adminNotes?: string;
  refundReference?: string;
}

export interface CreateHeaderCategoryData {
  name: string;
  image?: string;
  order?: number;
  isActive?: boolean;
  categoryId: string;
}

export interface UpdateHeaderCategoryData {
  name?: string;
  image?: string;
  order?: number;
  isActive?: boolean;
  categoryId?: string;
}

export interface CreateHomeSectionData {
  title: string;
  type: "banner" | "featured_products" | "categories" | "deals";
  content: any;
  order?: number;
  isActive?: boolean;
}

export interface UpdateHomeSectionData {
  title?: string;
  type?: "banner" | "featured_products" | "categories" | "deals";
  content?: any;
  order?: number;
  isActive?: boolean;
}

export interface GetMiscParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * User Management APIs
 */
export const getUsers = async (
  params?: GetMiscParams
): Promise<ApiResponse<User[]>> => {
  const response = await api.get<ApiResponse<User[]>>("/admin/customers", {
    params,
  });
  return response.data;
};

export const getUserById = async (id: string): Promise<ApiResponse<User>> => {
  const response = await api.get<ApiResponse<User>>(`/admin/customers/${id}`);
  return response.data;
};

export const updateUserStatus = async (
  id: string,
  status: "Active" | "Inactive" | "Deleted"
): Promise<ApiResponse<User>> => {
  const response = await api.patch<ApiResponse<User>>(
    `/admin/customers/${id}/status`,
    { status }
  );
  return response.data;
};

export const updateUser = async (
  id: string,
  data: Partial<User>
): Promise<ApiResponse<User>> => {
  const response = await api.put<ApiResponse<User>>(`/admin/customers/${id}`, data);
  return response.data;
};

/**
 * Return Request APIs
 */
export const getReturnRequests = async (
  params?: GetMiscParams
): Promise<ApiResponse<MiscReturnRequest[]>> => {
  const response = await api.get<ApiResponse<MiscReturnRequest[]>>(
    "/admin/return-requests",
    { params }
  );
  return response.data;
};

export const getReturnRequestById = async (
  id: string
): Promise<ApiResponse<MiscReturnRequest>> => {
  const response = await api.get<ApiResponse<MiscReturnRequest>>(
    `/admin/return-requests/${id}`
  );
  return response.data;
};

export const updateReturnRequest = async (
  id: string,
  data: UpdateReturnRequestData
): Promise<ApiResponse<MiscReturnRequest>> => {
  const response = await api.put<ApiResponse<MiscReturnRequest>>(
    `/admin/return-requests/${id}`,
    data
  );
  return response.data;
};

export const rebroadcastReturnRequest = async (
  id: string
): Promise<ApiResponse<MiscReturnRequest>> => {
  const response = await api.post<ApiResponse<MiscReturnRequest>>(
    `/admin/return-requests/${id}/rebroadcast`
  );
  return response.data;
};

export const reassignRider = async (
  id: string,
  deliveryBoyId: string
): Promise<ApiResponse<MiscReturnRequest>> => {
  const response = await api.post<ApiResponse<MiscReturnRequest>>(
    `/admin/return-requests/${id}/reassign`,
    { deliveryBoyId }
  );
  return response.data;
};

/**
 * Header Category APIs
 */
export const getHeaderCategories = async (
  params?: GetMiscParams
): Promise<ApiResponse<HeaderCategory[]>> => {
  const response = await api.get<ApiResponse<HeaderCategory[]>>(
    "/admin/header-categories",
    { params }
  );
  return response.data;
};

export const createHeaderCategory = async (
  data: CreateHeaderCategoryData
): Promise<ApiResponse<HeaderCategory>> => {
  const response = await api.post<ApiResponse<HeaderCategory>>(
    "/admin/header-categories",
    data
  );
  return response.data;
};

export const updateHeaderCategory = async (
  id: string,
  data: UpdateHeaderCategoryData
): Promise<ApiResponse<HeaderCategory>> => {
  const response = await api.put<ApiResponse<HeaderCategory>>(
    `/admin/header-categories/${id}`,
    data
  );
  return response.data;
};

export const deleteHeaderCategory = async (
  id: string
): Promise<ApiResponse<void>> => {
  const response = await api.delete<ApiResponse<void>>(
    `/admin/header-categories/${id}`
  );
  return response.data;
};

export const updateHeaderCategoryOrder = async (
  categories: Array<{ id: string; order: number }>
): Promise<ApiResponse<void>> => {
  const response = await api.put<ApiResponse<void>>(
    "/admin/header-categories/order",
    { categories }
  );
  return response.data;
};

/**
 * Home Section APIs
 */
export const getHomeSections = async (): Promise<ApiResponse<MiscHomeSection[]>> => {
  const response = await api.get('/admin/cms/home-sections');
  return response.data;
};

export const updateHomeSections = async (sections: MiscHomeSection[]): Promise<ApiResponse<MiscHomeSection[]>> => {
  const response = await api.put('/admin/cms/home-sections', { sections });
  return response.data;
};

export const updateHomeSection = async (
  id: string,
  data: UpdateHomeSectionData
): Promise<ApiResponse<MiscHomeSection>> => {
  const response = await api.put<ApiResponse<MiscHomeSection>>(
    `/admin/home-sections/${id}`,
    data
  );
  return response.data;
};

export const deleteHomeSection = async (
  id: string
): Promise<ApiResponse<void>> => {
  const response = await api.delete<ApiResponse<void>>(
    `/admin/home-sections/${id}`
  );
  return response.data;
};

export const updateHomeSectionOrder = async (
  sections: Array<{ id: string; order: number }>
): Promise<ApiResponse<void>> => {
  const response = await api.put<ApiResponse<void>>(
    "/admin/home-sections/order",
    { sections }
  );
  return response.data;
};
