import api from "../config";
import { ApiResponse } from "./types";

export interface CashCollectionStats {
  totalCodCollected: number;
  totalSubmitted: number;
  pendingAmount: number;
  agentsWithPending: number;
}

export interface AgentCashSummary {
  _id: string;
  name: string;
  mobile: string;
  cashCollected: number;
  pending: number;
  lastSubmissionDate: string | null;
  status: string;
}

export interface CashCollectionRecord {
  _id: string;
  deliveryBoyName: string;
  amount: number;
  paymentMode: string;
  collectedAt: string;
  orderNumber?: string;
}

/**
 * Get Cash Collection Dashboard Stats
 */
export const getCashCollectionStats = async (): Promise<ApiResponse<CashCollectionStats>> => {
  const response = await api.get<ApiResponse<CashCollectionStats>>("/admin/cash-collections/dashboard/stats");
  return response.data;
};

/**
 * Get Agents Cash Summary
 */
export const getAgentsCashSummary = async (search: string = ""): Promise<ApiResponse<AgentCashSummary[]>> => {
  const response = await api.get<ApiResponse<AgentCashSummary[]>>("/admin/cash-collections/dashboard/agents-summary", {
    params: { search }
  });
  return response.data;
};

/**
 * Process Agent-level Cash Collection
 */
export const processAgentCollection = async (data: {
  deliveryBoyId: string;
  amount: number;
  paymentMode: string;
  referenceId?: string;
  remark?: string;
}): Promise<ApiResponse<any>> => {
  const response = await api.post<ApiResponse<any>>("/admin/cash-collections/dashboard/collect", data);
  return response.data;
};

/**
 * Get Recent Collections (Reuse existing list endpoint)
 */
export const getRecentCollections = async (params?: any): Promise<ApiResponse<any[]>> => {
  const response = await api.get<ApiResponse<any[]>>("/admin/cash-collections", { params });
  return response.data;
};
