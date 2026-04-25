import api from "../config";
import { ApiResponse } from "./types";

// TYPES

export interface WalletStats {
  totalGMV: number;
  currentAccountBalance: number;
  totalAdminEarnings: number;
  sellerPendingPayouts: number;
  deliveryPendingPayouts: number;
  pendingFromDeliveryBoy: number;
  pendingWithdrawalsCount?: number;

  // New Breakdown Fields
  liquidity?: {
    cash: number;
    online: number;
    total: number;
  };
  profitBreakdown?: {
    productCommission: number;
    deliveryCommission: number;
    platformFees: number;
  };
  performance?: {
    date: string;
    amount: number;
    orders: number;
  }[];
}

export interface WithdrawalStats {
  totalRequests: number;
  pendingRequests: number;
  approvedAmount: number;
  rejectedRequests: number;
}

export interface WalletTransaction {
  _id: string;
  type: string;
  userType: string;
  userName?: string;
  amount: number;
  description: string;
  status: string;
  reference: string;
  createdAt: string;
  relatedOrder?: { orderNumber: string };
}

export interface WithdrawalRequest {
  _id: string;
  id?: string;
  userId: any; // Populated user object
  userType: "SELLER" | "DELIVERY_BOY";
  amount: number;
  status: "Pending" | "Approved" | "Rejected" | "Completed";
  paymentMethod: string;
  accountDetails: string;
  remarks?: string;
  transactionReference?: string;
  availableBalance?: number;
  createdAt: string;
  updatedAt: string;
  processedBy?: { name: string; email: string };
  processedAt?: string;
}

export interface AdminEarning {
  id: string;
  source: string;
  amount: number;
  date: string;
  status: string;
  description: string;
}

export interface SellerSettlementStats {
  totalSellerEarnings: number;
  codReceived: number;
  alreadyPaid: number;
  availableToSettle: number;
  pendingCod: number;
}

export interface SellerTransaction {
  id: string;
  amount: number;
  transactionType: string;
  date: string;
  type: string;
  status: string;
  description: string;
}

// API METHODS

/**
 * Get Financial Dashboard Stats
 */
export const getFinancialDashboard = async (): Promise<ApiResponse<WalletStats>> => {
  const response = await api.get<ApiResponse<WalletStats>>("/admin/financial/dashboard");
  return response.data;
};

/**
 * Get Withdrawal Statistics
 */
export const getWithdrawalStats = async (): Promise<ApiResponse<WithdrawalStats>> => {
  const response = await api.get<ApiResponse<WithdrawalStats>>("/admin/withdrawals/stats");
  return response.data;
};

/**
 * Get Admin Earnings (Commissions)
 */
export const getAdminEarnings = async (
  params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string }
): Promise<ApiResponse<AdminEarning[]>> => {
  const response = await api.get<ApiResponse<AdminEarning[]>>(
    "/admin/wallet/earnings",
    { params }
  );
  return response.data;
};

/**
 * Get Wallet Transactions (Platform Level)
 */
export const getWalletTransactions = async (
  params?: { page?: number; limit?: number; type?: string; status?: string; userType?: string }
): Promise<ApiResponse<WalletTransaction[]>> => {
  const response = await api.get<ApiResponse<WalletTransaction[]>>(
    "/admin/wallet/transactions",
    { params }
  );
  return response.data;
};

/**
 * Get Withdrawal Requests
 */
export const getWithdrawalRequests = async (
  params?: { page?: number; limit?: number; status?: string; userType?: string; search?: string; startDate?: string; endDate?: string }
): Promise<ApiResponse<{ requests: WithdrawalRequest[]; pagination: any }>> => {
  const response = await api.get<ApiResponse<{ requests: WithdrawalRequest[]; pagination: any }>>(
    "/admin/wallet/withdrawals",
    { params }
  );
  return response.data;
};

/**
 * Approve Withdrawal (Processes Payout)
 */
export const approveWithdrawal = async (id: string, data: { transactionReference: string; remarks?: string }): Promise<ApiResponse<any>> => {
  const response = await api.patch<ApiResponse<any>>(`/admin/withdrawals/${id}/approve`, data);
  return response.data;
};

/**
 * Reject Withdrawal
 */
export const rejectWithdrawal = async (id: string, remarks: string): Promise<ApiResponse<any>> => {
  const response = await api.patch<ApiResponse<any>>(`/admin/withdrawals/${id}/reject`, { remarks });
  return response.data;
};

/**
 * Complete Withdrawal (Legacy)
 */
export const completeWithdrawal = async (id: string, transactionReference: string): Promise<ApiResponse<any>> => {
  const response = await api.patch<ApiResponse<any>>(`/admin/withdrawals/${id}/complete`, { transactionReference });
  return response.data;
};

/**
 * Process Withdrawal (Helper)
 */
export const processWithdrawal = async (
  data: { requestId: string; action: "Approve" | "Reject" | "Complete"; remark?: string; transactionReference?: string }
): Promise<ApiResponse<any>> => {
  if (data.action === "Approve") return approveWithdrawal(data.requestId, { transactionReference: data.transactionReference!, remarks: data.remark });
  if (data.action === "Reject") return rejectWithdrawal(data.requestId, data.remark || '');
  if (data.action === "Complete") return completeWithdrawal(data.requestId, data.transactionReference || '');
  throw new Error("Invalid action");
};

export const getSellerTransactions = async (
  sellerId: string,
  params?: { page?: number; limit?: number }
): Promise<ApiResponse<any[]>> => {
  const response = await api.get<ApiResponse<any[]>>(
    `/admin/wallet/seller/${sellerId}`,
    { params }
  );
  return response.data;
};

/**
 * Get Seller Settlement Stats
 */
export const getSellerSettlementStats = async (sellerId?: string): Promise<ApiResponse<SellerSettlementStats>> => {
  const response = await api.get<ApiResponse<SellerSettlementStats>>("/admin/wallet/seller-settlement/stats", { params: { sellerId } });
  return response.data;
};

/**
 * Process Seller Settlement (Payout)
 */
export const processSellerSettlement = async (data: {
  sellerId: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
  notes?: string;
}): Promise<ApiResponse<any>> => {
  const response = await api.post<ApiResponse<any>>("/admin/wallet/seller-settlement/payout", data);
  return response.data;
};
