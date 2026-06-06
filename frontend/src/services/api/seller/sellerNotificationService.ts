import api from "../config";

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Get seller notifications
 */
export const getSellerNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  const response = await api.get<ApiResponse<Notification[]>>("/seller/notifications");
  return response.data;
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  const response = await api.put<ApiResponse<Notification>>(`/seller/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark multiple notifications as read
 */
export const markMultipleAsRead = async (notificationIds: string[]): Promise<ApiResponse<{ modified: number }>> => {
  const response = await api.patch<ApiResponse<{ modified: number }>>("/seller/notifications/mark-read", {
    notificationIds,
  });
  return response.data;
};
