import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import CashCollection from "../../../models/CashCollection";
import Delivery from "../../../models/Delivery";
import Order from "../../../models/Order";
import PlatformWallet from "../../../models/PlatformWallet";
import { processPendingCODPayouts } from "../../../services/commissionService";
import mongoose from "mongoose";

/**
 * Get all cash collections
 */
export const getCashCollections = asyncHandler(
    async (req: Request, res: Response) => {
        const {
            page = 1,
            limit = 10,
            deliveryBoyId,
            fromDate,
            toDate,
            // search = "",
            sortBy = "collectedAt",
            sortOrder = "desc",
        } = req.query;

        const query: any = {};

        // Filter by delivery boy
        if (deliveryBoyId) {
            query.deliveryBoy = deliveryBoyId;
        }

        // Date range filter
        if (fromDate || toDate) {
            query.collectedAt = {};
            if (fromDate) {
                query.collectedAt.$gte = new Date(fromDate as string);
            }
            if (toDate) {
                query.collectedAt.$lte = new Date(toDate as string);
            }
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const sort: any = {};
        sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

        const [collections, total] = await Promise.all([
            CashCollection.find(query)
                .populate("deliveryBoy", "name mobile")
                .populate("order", "orderNumber total")
                .populate("collectedBy", "name")
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit as string)),
            CashCollection.countDocuments(query),
        ]);

        // Transform data to match frontend expectations
        const transformedCollections = collections.map((collection: any) => ({
            _id: collection._id,
            deliveryBoyId: collection.deliveryBoy?._id,
            deliveryBoyName: collection.deliveryBoy?.name || "Unknown",
            orderId: collection.order?._id,
            orderNumber: collection.order?.orderNumber || "Unknown",
            total: collection.order?.total || 0,

            amount: collection.amount,
            remark: collection.remark,
            collectedAt: collection.collectedAt,
            collectedBy: collection.collectedBy?.name || "Unknown",
        }));

        return res.status(200).json({
            success: true,
            message: "Cash collections fetched successfully",
            data: transformedCollections,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    }
);

/**
 * Get cash collection by ID
 */
export const getCashCollectionById = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const collection = await CashCollection.findById(id)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name");

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cash collection fetched successfully",
            data: collection,
        });
    }
);

/**
 * Create cash collection
 */
export const createCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { deliveryBoyId, orderId, amount, remark } = req.body;

        if (!deliveryBoyId || !orderId || !amount) {
            return res.status(400).json({
                success: false,
                message: "Delivery boy ID, order ID, and amount are required",
            });
        }

        // Verify delivery boy exists
        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: "Delivery boy not found",
            });
        }

        // Verify order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Create cash collection
        const collection = await CashCollection.create({
            deliveryBoy: deliveryBoyId,
            order: orderId,
            amount,
            remark,
            collectedBy: req.user?.userId,
            collectedAt: new Date(),
        });

        // Update delivery boy's cash collected
        deliveryBoy.cashCollected = (deliveryBoy.cashCollected || 0) - amount;
        await deliveryBoy.save();

        const populatedCollection = await CashCollection.findById(collection._id)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name");

        return res.status(201).json({
            success: true,
            message: "Cash collection created successfully",
            data: populatedCollection,
        });
    }
);

/**
 * Update cash collection
 */
export const updateCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { amount, remark } = req.body;

        const collection = await CashCollection.findById(id);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        // If amount is being updated, adjust delivery boy's cash collected
        if (amount !== undefined && amount !== collection.amount) {
            const deliveryBoy = await Delivery.findById(collection.deliveryBoy);
            if (deliveryBoy) {
                const difference = collection.amount - amount;
                deliveryBoy.cashCollected =
                    (deliveryBoy.cashCollected || 0) + difference;
                await deliveryBoy.save();
            }
            collection.amount = amount;
        }

        if (remark !== undefined) {
            collection.remark = remark;
        }

        await collection.save();

        const updatedCollection = await CashCollection.findById(id)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name");

        return res.status(200).json({
            success: true,
            message: "Cash collection updated successfully",
            data: updatedCollection,
        });
    }
);

/**
 * Delete cash collection
 */
export const deleteCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const collection = await CashCollection.findById(id);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        // Restore the amount to delivery boy's cash collected
        const deliveryBoy = await Delivery.findById(collection.deliveryBoy);
        if (deliveryBoy) {
            deliveryBoy.cashCollected =
                (deliveryBoy.cashCollected || 0) + collection.amount;
            await deliveryBoy.save();
        }

        await CashCollection.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Cash collection deleted successfully",
        });
    }
);

/**
 * Get Cash Collection Dashboard Stats
 */
export const getCashCollectionStats = asyncHandler(async (_req: Request, res: Response) => {
  // 1. Total COD Collected by riders (from delivered COD orders)
  // We use Order aggregate for historical 'Total Collected'
  const codResult = await Order.aggregate([
    { $match: { paymentMethod: 'COD', status: 'Delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const totalCodHistorical = codResult[0]?.total || 0;

  // 2. Total Submitted to Admin (Historical)
  const submittedResult = await CashCollection.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalSubmittedHistorical = submittedResult[0]?.total || 0;

  // 3. Current Pending Amount (Live - Sum of all riders' cashCollected)
  // This is the most accurate 'Live' data
  const pendingResult = await Delivery.aggregate([
    { $match: { status: 'Active' } },
    { $group: { _id: null, total: { $sum: '$cashCollected' } } }
  ]);
  const pendingAmount = pendingResult[0]?.total || 0;

  // 4. Agents with Pending
  const agentsWithPending = await Delivery.countDocuments({ cashCollected: { $gt: 0 } });

  return res.status(200).json({
    success: true,
    data: {
      totalCodCollected: totalCodHistorical,
      totalSubmitted: totalSubmittedHistorical,
      pendingAmount,
      agentsWithPending
    }
  });
});

/**
 * Get Delivery Agents Cash Summary
 */
export const getAgentsCashSummary = asyncHandler(async (req: Request, res: Response) => {
  const { search = "" } = req.query;

  const query: any = { status: 'Active' };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  const agents = await Delivery.find(query).select('name mobile cashCollected updatedAt');

  // For each agent, find their last submission date
  const agentIds = agents.map(a => a._id);
  const lastSubmissions = await CashCollection.aggregate([
    { $match: { deliveryBoy: { $in: agentIds } } },
    { $sort: { collectedAt: -1 } },
    { $group: { _id: '$deliveryBoy', lastDate: { $first: '$collectedAt' } } }
  ]);

  const submissionMap = new Map(lastSubmissions.map(s => [s._id.toString(), s.lastDate]));

  const summary = agents.map(agent => {
    const pending = agent.cashCollected || 0;
    let status = 'Settled';
    if (pending > 0) status = 'Pending';

    return {
      _id: agent._id,
      name: agent.name,
      mobile: agent.mobile,
      cashCollected: pending,
      pending: pending,
      lastSubmissionDate: submissionMap.get(agent._id.toString()) || null,
      status: status
    };
  });

  return res.status(200).json({
    success: true,
    data: summary
  });
});

/**
 * Process Agent-level Cash Collection (Reconcile)
 */
export const processAgentCollection = asyncHandler(async (req: Request, res: Response) => {
  const { deliveryBoyId, amount, paymentMode, referenceId, remark } = req.body;

  if (!deliveryBoyId || !amount || amount < 1) {
    return res.status(400).json({
      success: false,
      message: "Delivery boy ID and amount (min ₹1) are required"
    });
  }

  const agent = await Delivery.findById(deliveryBoyId);
  if (!agent) {
    return res.status(404).json({
      success: false,
      message: "Delivery agent not found"
    });
  }

  if (amount > agent.cashCollected) {
    return res.status(400).json({
      success: false,
      message: `Amount exceeds agent's pending cash (₹${agent.cashCollected})`
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create general cash collection record
    const collection = await CashCollection.create([{
      deliveryBoy: deliveryBoyId,
      amount,
      paymentMode,
      referenceId,
      remark,
      collectedBy: req.user?.userId,
      collectedAt: new Date(),
    }], { session });

    // Calculate the 'Owed' portion (Net) to update Platform Wallet
    const ratio = agent.pendingAdminPayout / (agent.cashCollected || 1);
    const netAmount = Math.round(amount * ratio * 100) / 100;

    // Decrease rider's balances
    agent.cashCollected = Math.max(0, agent.cashCollected - amount);
    agent.pendingAdminPayout = Math.max(0, agent.pendingAdminPayout - netAmount);
    await agent.save({ session });

    // Update Platform Wallet Stats (Live Sync)
    const wallet = await PlatformWallet.getWallet();
    wallet.pendingFromDeliveryBoy = Math.max(0, wallet.pendingFromDeliveryBoy - netAmount);
    wallet.currentPlatformBalance += amount; // Admin now has this cash available
    await wallet.save({ session });

    // CRITICAL: Trigger commission distribution to Sellers and recognization of Admin Earning
    // This credits the sellers' wallets for the portion of this cash that belongs to them.
    await processPendingCODPayouts(deliveryBoyId, amount, session);

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Cash collected successfully and balances reconciled",
      data: collection[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error in processAgentCollection:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during reconciliation"
    });
  } finally {
    session.endSession();
  }
});
