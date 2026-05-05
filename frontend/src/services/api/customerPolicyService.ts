import api from "./config";
import { ApiResponse } from "./admin/types";

export interface Policy {
  _id: string;
  type: "customer" | "delivery" | "seller";
  title: string;
  content: string;
  version: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getPublicPolicies = async (type?: string): Promise<ApiResponse<Policy[]>> => {
  const response = await api.get<ApiResponse<Policy[]>>("/customer/policies", {
    params: { type },
  });
  return response.data;
};
