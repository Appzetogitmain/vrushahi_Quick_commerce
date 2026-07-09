import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import SubscriptionPlan from '../../../models/SubscriptionPlan';
import SellerSubscription from '../../../models/SellerSubscription';
import Seller from '../../../models/Seller';
import { 
  createSubscriptionPaymentOrder, 
  activateSubscription, 
  switchToCommissionModel 
} from '../../../services/subscriptionService';

// @desc    Get all active subscription plans
// @route   GET /api/seller/subscription/plans
// @access  Public (for registration) or Private (for renewal)
export const getActiveSubscriptionPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await SubscriptionPlan.find({ isActive: true }).sort({ duration: 1, actualPrice: 1 });
  res.json({ success: true, data: plans });
});

// @desc    Get current seller's subscription details
// @route   GET /api/seller/subscription/my
// @access  Private/Seller
export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.userId;
  const seller = await Seller.findById(sellerId);
  
  if (!seller) {
    res.status(404);
    throw new Error('Seller not found');
  }

  let currentSubscription = null;
  if (seller.currentSubscriptionId) {
    currentSubscription = await SellerSubscription.findById(seller.currentSubscriptionId).populate('plan');
  }

  const history = await SellerSubscription.find({ seller: sellerId })
    .populate('plan')
    .sort({ createdAt: -1 });

  res.json({ 
    success: true, 
    data: {
      businessModel: seller.businessModel,
      subscriptionStatus: seller.subscriptionStatus,
      currentSubscription,
      history
    }
  });
});

// @desc    Create Razorpay order for subscription payment
// @route   POST /api/seller/subscription/create-payment
// @access  Private/Seller
export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.body;
  const sellerId = req.user?.userId;

  if (!planId) {
    res.status(400);
    throw new Error('Plan ID is required');
  }

  const paymentData = await createSubscriptionPaymentOrder(sellerId as string, planId);
  
  res.json({ success: true, data: paymentData });
});

// @desc    Verify payment and activate subscription
// @route   POST /api/seller/subscription/verify-payment
// @access  Private/Seller
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isRenewal } = req.body;
  const sellerId = req.user?.userId;

  if (!planId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res.status(400);
    throw new Error('Missing payment verification details');
  }

  try {
    const result = await activateSubscription(
      sellerId as string, 
      planId, 
      { razorpayOrderId, razorpayPaymentId, razorpaySignature },
      isRenewal || false
    );
    
    res.json(result);
  } catch (error: any) {
    console.error("Payment verification error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Switch to commission model
// @route   POST /api/seller/subscription/switch-to-commission
// @access  Private/Seller
export const switchModelToCommission = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.userId;
  const result = await switchToCommissionModel(sellerId as string);
  res.json(result);
});

// @desc    Acknowledge subscription expiry and dismiss notification
// @route   POST /api/seller/subscription/acknowledge-expiry
// @access  Private/Seller
export const acknowledgeExpiry = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.userId;
  const seller = await Seller.findById(sellerId);
  
  if (!seller) {
    res.status(404);
    throw new Error('Seller not found');
  }

  // Clear current subscription ID and set status to 'None' so popup goes away
  seller.currentSubscriptionId = undefined;
  seller.subscriptionStatus = 'None';
  seller.businessModel = 'Commission'; // Ensure they are commission-based
  
  await seller.save();
  
  res.json({ success: true, message: 'Expiry acknowledged' });
});
