import api from '../config';

// Plan Management
export const getSubscriptionPlans = async (page: number = 1, limit: number = 10, search?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);

  const response = await api.get(`/admin/subscription-plans?${params.toString()}`);
  return response.data;
};

export const createSubscriptionPlan = async (data: any) => {
  const response = await api.post('/admin/subscription-plans', data);
  return response.data;
};

export const updateSubscriptionPlan = async (planId: string, data: any) => {
  const response = await api.put(`/admin/subscription-plans/${planId}`, data);
  return response.data;
};

export const deleteSubscriptionPlan = async (planId: string) => {
  const response = await api.delete(`/admin/subscription-plans/${planId}`);
  return response.data;
};

// Revenue and Statistics
export const getSubscriptionStats = async () => {
  const response = await api.get('/admin/subscriptions/stats');
  return response.data;
};

export const getSubscriptionRevenue = async (page: number = 1, limit: number = 10, search?: string, status?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  const response = await api.get(`/admin/subscriptions?${params.toString()}`);
  return response.data;
};
