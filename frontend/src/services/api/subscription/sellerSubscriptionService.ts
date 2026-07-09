import api from '../config';

export const getActiveSubscriptionPlans = async () => {
  const response = await api.get('/seller/subscription/plans');
  return response.data;
};

export const getMySubscription = async () => {
  const response = await api.get('/seller/subscription/my');
  return response.data;
};

export const createSubscriptionPaymentOrder = async (planId: string) => {
  const response = await api.post('/seller/subscription/create-payment', { planId });
  return response.data;
};

export const verifySubscriptionPayment = async (paymentDetails: {
  planId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  isRenewal?: boolean;
}) => {
  const response = await api.post('/seller/subscription/verify-payment', paymentDetails);
  return response.data;
};

export const switchModelToCommission = async () => {
  const response = await api.post('/seller/subscription/switch-to-commission');
  return response.data;
};

export const acknowledgeSubscriptionExpiry = async () => {
  const response = await api.post('/seller/subscription/acknowledge-expiry');
  return response.data;
};
