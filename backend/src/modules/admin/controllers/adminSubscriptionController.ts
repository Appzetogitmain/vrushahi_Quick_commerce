import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import SubscriptionPlan from '../../../models/SubscriptionPlan';
import SellerSubscription from '../../../models/SellerSubscription';
import { getSubscriptionStats } from '../../../services/subscriptionService';

// @desc    Get all subscription plans
// @route   GET /api/admin/subscription-plans
// @access  Private/Admin
export const getSubscriptionPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await SubscriptionPlan.find().sort({ duration: 1, actualPrice: 1 });
  res.json({ success: true, data: plans });
});

// @desc    Create subscription plan
// @route   POST /api/admin/subscription-plans
// @access  Private/Admin
export const createSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const { name, duration, actualPrice, discountedPrice, description, isActive } = req.body;

  const plan = new SubscriptionPlan({
    name,
    duration,
    actualPrice,
    discountedPrice,
    description,
    isActive: isActive !== undefined ? isActive : true,
  });

  const createdPlan = await plan.save();
  res.status(201).json({ success: true, data: createdPlan });
});

// @desc    Update subscription plan
// @route   PUT /api/admin/subscription-plans/:id
// @access  Private/Admin
export const updateSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await SubscriptionPlan.findById(req.params.id);

  if (plan) {
    plan.name = req.body.name || plan.name;
    plan.duration = req.body.duration !== undefined ? req.body.duration : plan.duration;
    plan.actualPrice = req.body.actualPrice !== undefined ? req.body.actualPrice : plan.actualPrice;
    plan.discountedPrice = req.body.discountedPrice !== undefined ? req.body.discountedPrice : plan.discountedPrice;
    plan.description = req.body.description !== undefined ? req.body.description : plan.description;
    plan.isActive = req.body.isActive !== undefined ? req.body.isActive : plan.isActive;

    const updatedPlan = await plan.save();
    res.json({ success: true, data: updatedPlan });
  } else {
    res.status(404);
    throw new Error('Subscription plan not found');
  }
});

// @desc    Toggle subscription plan status
// @route   PATCH /api/admin/subscription-plans/:id/toggle
// @access  Private/Admin
export const toggleSubscriptionPlanStatus = asyncHandler(async (req: Request, res: Response) => {
  const plan = await SubscriptionPlan.findById(req.params.id);

  if (plan) {
    plan.isActive = !plan.isActive;
    const updatedPlan = await plan.save();
    res.json({ success: true, data: updatedPlan });
  } else {
    res.status(404);
    throw new Error('Subscription plan not found');
  }
});

// @desc    Delete subscription plan
// @route   DELETE /api/admin/subscription-plans/:id
// @access  Private/Admin
export const deleteSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await SubscriptionPlan.findById(req.params.id);

  if (plan) {
    // Check if any seller is using this plan
    const usageCount = await SellerSubscription.countDocuments({ plan: plan._id });
    if (usageCount > 0) {
      res.status(400);
      throw new Error('Cannot delete plan because it is being used by sellers. Consider disabling it instead.');
    }

    await plan.deleteOne();
    res.json({ success: true, message: 'Plan removed' });
  } else {
    res.status(404);
    throw new Error('Subscription plan not found');
  }
});

// @desc    Get subscription statistics
// @route   GET /api/admin/subscriptions/stats
// @access  Private/Admin
export const getAdminSubscriptionStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getSubscriptionStats();
  res.json({ success: true, data: stats });
});

// @desc    Get all seller subscriptions
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
export const getAllSellerSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const subscriptions = await SellerSubscription.find()
    .populate('seller', 'sellerName storeName email mobile status')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await SellerSubscription.countDocuments();

  res.json({ 
    success: true, 
    data: subscriptions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});
