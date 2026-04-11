import api from "./config";

export interface StoreDetailsResponse {
  success: boolean;
  data: {
    seller: {
      id: string;
      storeName: string;
      logo?: string;
      banner?: string;
      storeBanner?: string;
      storeDescription?: string;
      address?: string;
      city?: string;
      rating?: number;
      reviewsCount?: number;
      deliveryTime?: string;
      [key: string]: any;
    };
    categories: Array<{
      id: string;
      name: string;
      products: any[];
    }>;
    allProducts: any[];
  };
}

/**
 * Get details and products for a specific seller's store
 */
export const getStoreDetails = async (
  sellerId: string,
  params?: {
    categories?: string[];
    brands?: string[];
    sort?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<StoreDetailsResponse> => {
  const response = await api.get<StoreDetailsResponse>(`/customer/stores/${sellerId}`, {
    params
  });
  return response.data;
};
