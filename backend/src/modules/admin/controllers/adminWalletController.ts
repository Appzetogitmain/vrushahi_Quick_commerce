import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../../../models/Order';
import OrderItem from '../../../models/OrderItem';
import Seller from '../../../models/Seller';
import Delivery from '../../../models/Delivery';
import CashCollection from '../../../models/CashCollection';
import Commission from '../../../models/Commission';
import WalletTransaction from '../../../models/WalletTransaction';
import WithdrawRequest from '../../../models/WithdrawRequest';
import PlatformWallet from '../../../models/PlatformWallet';
import { asyncHandler } from '../../../utils/asyncHandler';
import { approveWithdrawal, rejectWithdrawal, completeWithdrawal } from './adminWithdrawalController';

/**
 * Get Financial Dashboard Stats
 */
export const getFinancialDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const wallet = await PlatformWallet.getWallet();

  // Calculate live balances for consistency
  const [
    sellerBalances, 
    deliveryBalances, 
    codInField, 
    pendingWithdrawals,
    totalProfitResult,
    onlineLiquidityResult,
    performanceTrend
  ] = await Promise.all([
    Seller.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
    Delivery.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
    Delivery.aggregate([{ $group: { _id: null, total: { $sum: '$cashCollected' } } }]),
    WithdrawRequest.countDocuments({ status: 'Pending' }),
    // Breakdown of commissions
    Commission.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { 
          _id: '$type', 
          total: { $sum: '$commissionAmount' } 
      }}
    ]),
    // Online liquidity (Payments already received by platform)
    Order.aggregate([
      { $match: { paymentStatus: 'Paid', paymentMethod: { $ne: 'COD' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    // 7-Day Performance Trend
    Order.aggregate([
      { $match: { 
          status: 'Delivered', 
          deliveredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }},
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ])
  ]);

  const totalSellerOwed = sellerBalances[0]?.total || 0;
  const totalDeliveryOwed = deliveryBalances[0]?.total || 0;
  const totalCodInField = codInField[0]?.total || 0;
  const onlineLiquidity = onlineLiquidityResult[0]?.total || 0;

  // Map profit breakdown
  const profits: any = { SELLER: 0, DELIVERY_BOY: 0 };
  totalProfitResult.forEach(p => profits[p._id] = p.total);

  return res.status(200).json({
    success: true,
    data: {
      totalGMV: wallet.totalPlatformEarning,
      currentAccountBalance: wallet.currentPlatformBalance,
      totalAdminEarnings: wallet.totalAdminEarning,
      sellerPendingPayouts: totalSellerOwed,
      deliveryPendingPayouts: totalDeliveryOwed,
      pendingFromDeliveryBoy: totalCodInField, 
      pendingWithdrawalsCount: pendingWithdrawals,
      
      // New Enhanced Fields
      liquidity: {
        cash: totalCodInField,
        online: onlineLiquidity,
        total: totalCodInField + onlineLiquidity
      },
      profitBreakdown: {
        productCommission: profits.SELLER || 0,
        deliveryCommission: profits.DELIVERY_BOY || 0,
        platformFees: wallet.totalAdminEarning - (profits.SELLER + profits.DELIVERY_BOY) // Remainder
      },
      performance: performanceTrend.map(day => ({
        date: day._id,
        amount: day.total,
        orders: day.count
      }))
    }
  });
});

/**
 * Get Admin Earnings (Commissions List)
 */
export const getAdminEarnings = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const earnings = await Commission.find(query)
    .populate('order', 'orderNumber')
    .populate('seller', 'storeName sellerName')
    .populate('deliveryBoy', 'name mobile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Commission.countDocuments(query);

  // Format data for frontend
  const formattedEarnings = earnings.map(e => {
    let sourceName = 'Unknown';
    if (e.type === 'SELLER' && e.seller) {
      sourceName = (e.seller as any).storeName || (e.seller as any).sellerName;
    } else if (e.type === 'DELIVERY_BOY' && e.deliveryBoy) {
      sourceName = (e.deliveryBoy as any).name;
    }

    return {
      id: e._id,
      source: sourceName,
      sourceType: e.type,
      amount: e.commissionAmount,
      date: e.createdAt,
      status: e.status,
      description: `Order #${(e.order as any)?.orderNumber || 'Unknown'}`,
      orderId: (e.order as any)?._id
    };
  });

  return res.status(200).json({
    success: true,
    data: formattedEarnings,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Get All Wallet Transactions (Sellers & Delivery Boys)
 */
/**
 * Get All Wallet Transactions (Sellers & Delivery Boys)
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, type, userType, search: _search } = req.query;

  const query: any = {};
  if (type) query.type = type;
  if (userType) query.userType = userType;

  // Search handling not fully implemented for cross-collection ref

  const skip = (Number(page) - 1) * Number(limit);

  // Fetch transactions without populate first, as refPath 'userType' values (SELLER/DELIVERY_BOY) 
  // do not match Model names (Seller/Delivery)
  const transactions = await WalletTransaction.find(query)
    .populate('relatedOrder', 'orderNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await WalletTransaction.countDocuments(query);

  // Manually populate user details
  const sellerIds: any[] = [];
  const deliveryIds: any[] = [];

  transactions.forEach(t => {
    if (t.userType === 'SELLER') sellerIds.push(t.userId);
    else if (t.userType === 'DELIVERY_BOY') deliveryIds.push(t.userId);
  });

  const [sellers, deliveryBoys] = await Promise.all([
    mongoose.model('Seller').find({ _id: { $in: sellerIds } }).select('storeName sellerName mobile email'),
    mongoose.model('Delivery').find({ _id: { $in: deliveryIds } }).select('name firstName lastName mobile email')
  ]);

  const sellerMap = new Map(sellers.map(s => [s._id.toString(), s]));
  const deliveryMap = new Map(deliveryBoys.map(d => [d._id.toString(), d]));

  // Format transactions
  const formattedTransactions = transactions.map((t: any) => {
    let userName = 'Unknown';
    let user: any = null;

    if (t.userType === 'SELLER') {
      user = sellerMap.get(t.userId.toString());
      if (user) {
        userName = user.storeName || user.sellerName;
      }
    } else if (t.userType === 'DELIVERY_BOY') {
      user = deliveryMap.get(t.userId.toString());
      if (user) {
        userName = user.name || (user.firstName ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : 'Delivery Partner');
      }
    }

    return {
      _id: t._id,
      type: t.type,
      userType: t.userType,
      userName: userName,
      userId: user, // Return full user object or just ID based on frontend need, ensuring compatibility
      amount: t.amount,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
      reference: t.reference,
      relatedOrder: t.relatedOrder ? { orderNumber: t.relatedOrder.orderNumber } : undefined
    };
  });

  return res.status(200).json({
    success: true,
    data: formattedTransactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Process Withdrawal Wrapper (to match frontend service expectation)
 */
export const processWithdrawalWrapper = asyncHandler(async (req: Request, res: Response) => {
  const { requestId, action, remark, transactionReference } = req.body;

  if (!requestId || !action) {
    return res.status(400).json({
      success: false,
      message: 'Request ID and action are required'
    });
  }

  // Mock the params for the existing controllers
  req.params.id = requestId;

  if (action === 'Approve') {
    return approveWithdrawal(req, res);
  } else if (action === 'Reject') {
    req.body.remarks = remark; // Map 'remark' to 'remarks'
    return rejectWithdrawal(req, res);
  } else if (action === 'Complete') {
    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required for completion'
      });
    }
    req.body.transactionReference = transactionReference;
    return completeWithdrawal(req, res);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be "Approve", "Reject", or "Complete"'
    });
  }
});

/**
 * Get Seller Settlement Stats
 */
export const getSellerSettlementStats = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.query;

  const query: any = { userType: 'SELLER', status: 'Completed' };
  if (sellerId && sellerId !== 'all') {
    query.userId = new mongoose.Types.ObjectId(sellerId as string);
  }

  // 1. Total Seller Earnings (Credits)
  const earningsResult = await WalletTransaction.aggregate([
    { $match: { ...query, type: 'Credit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalSellerEarnings = earningsResult[0]?.total || 0;

  // 2. Total Already Paid (Debits)
  const paidResult = await WalletTransaction.aggregate([
    { $match: { ...query, type: 'Debit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const alreadyPaid = paidResult[0]?.total || 0;

  // 3. COD Received (Admin Wallet)
  // We sum CashCollection amount. If sellerId is provided, we only take the portion belonging to this seller.
  let codReceived = 0;
  if (sellerId && sellerId !== 'all') {
    // Sum from OrderItems where order is COD and cash is collected
    const cashCollectedOrderIds = await CashCollection.find().distinct('order');
    const codResult = await OrderItem.aggregate([
      { 
        $match: { 
          seller: new mongoose.Types.ObjectId(sellerId as string),
          order: { $in: cashCollectedOrderIds }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    codReceived = codResult[0]?.total || 0;
  } else {
    const cashResult = await CashCollection.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    codReceived = cashResult[0]?.total || 0;
  }

  // 4. Online Received (Delivered orders, not COD, Paid)
  let onlineReceived = 0;
  if (sellerId && sellerId !== 'all') {
    const onlineResult = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderData'
        }
      },
      { $unwind: '$orderData' },
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId as string),
          'orderData.paymentMethod': { $ne: 'COD' },
          'orderData.paymentStatus': 'Paid',
          'orderData.status': 'Delivered'
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    onlineReceived = onlineResult[0]?.total || 0;
  } else {
    const onlineResult = await Order.aggregate([
      { $match: { paymentMethod: { $ne: 'COD' }, paymentStatus: 'Paid', status: 'Delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    onlineReceived = onlineResult[0]?.total || 0;
  }

  const totalReceived = codReceived + onlineReceived;

  // 5. Pending COD (Money still with delivery boys)
  let pendingCod = 0;
  if (sellerId && sellerId !== 'all') {
    const pendingCodResult = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderData'
        }
      },
      { $unwind: '$orderData' },
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId as string),
          'orderData.status': 'Delivered',
          'orderData.paymentMethod': 'COD',
          'orderData.paymentStatus': 'Pending'
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    pendingCod = pendingCodResult[0]?.total || 0;
  } else {
    const pendingCodResult = await Order.aggregate([
      { $match: { status: 'Delivered', paymentMethod: 'COD', paymentStatus: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    pendingCod = pendingCodResult[0]?.total || 0;
  }

  return res.status(200).json({
    success: true,
    data: {
      totalSellerEarnings,
      codReceived: totalReceived, // Renamed to include online as per requirement "COD Received (Admin Wallet) or online recieved"
      alreadyPaid,
      availableToSettle: Math.max(0, totalReceived - alreadyPaid),
      pendingCod
    }
  });
});

/**
 * Process Seller Settlement (Payout)
 */
export const processSellerSettlement = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId, amount, paymentMethod, referenceId, notes } = req.body;

  if (!sellerId || !amount || amount < 1) {
    return res.status(400).json({
      success: false,
      message: 'Seller ID and amount (min ₹1) are required'
    });
  }

  const seller = await Seller.findById(sellerId);
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: 'Seller not found'
    });
  }

  // Calculate available settlement amount (Global or per seller? Requirement says "strictly controlled by admin wallet balance")
  // Let's check global available cash first
  const cashResult = await CashCollection.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const onlineResult = await Order.aggregate([
    { $match: { paymentMethod: { $ne: 'COD' }, paymentStatus: 'Paid', status: 'Delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const paidResult = await WalletTransaction.aggregate([
    { $match: { userType: 'SELLER', type: 'Debit', status: 'Completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const totalReceived = (cashResult[0]?.total || 0) + (onlineResult[0]?.total || 0);
  const totalAlreadyPaid = paidResult[0]?.total || 0;
  const availableGlobal = totalReceived - totalAlreadyPaid;

  if (amount > availableGlobal) {
    return res.status(400).json({
      success: false,
      message: `Insufficient admin wallet balance. Max available: ₹${availableGlobal.toFixed(2)}`
    });
  }

  // Also check seller's actual balance
  if (amount > seller.balance) {
    return res.status(400).json({
      success: false,
      message: `Amount exceeds seller's wallet balance (₹${seller.balance.toFixed(2)})`
    });
  }

  // Create Payout Transaction
  const transaction = await WalletTransaction.create({
    userId: seller._id,
    userType: 'SELLER',
    amount: amount,
    type: 'Debit',
    description: notes || `Settlement via ${paymentMethod}`,
    status: 'Completed',
    reference: referenceId || `SETL-${Date.now()}`,
  });

  // Update Seller Balance
  seller.balance -= amount;
  await seller.save();

  // Update Platform Wallet (optional but good for global tracking)
  const platformWallet = await PlatformWallet.getWallet();
  platformWallet.currentPlatformBalance -= amount;
  platformWallet.sellerPendingPayouts -= amount;
  await platformWallet.save();

  return res.status(200).json({
    success: true,
    message: 'Settlement processed successfully',
    data: transaction
  });
});

/**
 * Get Delivery Settlement Stats
 */
export const getDeliverySettlementStats = asyncHandler(async (req: Request, res: Response) => {
  const { deliveryBoyId } = req.query;

  const query: any = { userType: 'DELIVERY_BOY', status: 'Completed' };
  if (deliveryBoyId && deliveryBoyId !== 'all') {
    query.userId = new mongoose.Types.ObjectId(deliveryBoyId as string);
  }

  // 1. Paid to Partner (Debits)
  const paidResult = await WalletTransaction.aggregate([
    { $match: { ...query, type: 'Debit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const paidToPartner = paidResult[0]?.total || 0;

  // 2. Partner Wallet Balance
  let partnerWalletBalance = 0;
  if (deliveryBoyId && deliveryBoyId !== 'all') {
    const deliveryBoy = await Delivery.findById(deliveryBoyId);
    partnerWalletBalance = deliveryBoy?.balance || 0;
  } else {
    const balanceResult = await Delivery.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    partnerWalletBalance = balanceResult[0]?.total || 0;
  }

  // 3. Total Partner Earnings (Derived: Balance + Paid)
  // We derive this to ensure consistency if some credit transactions are missing in history
  const totalPartnerEarnings = partnerWalletBalance + paidToPartner;

  return res.status(200).json({
    success: true,
    data: {
      totalPartnerEarnings,
      paidToPartner,
      partnerWalletBalance
    }
  });
});

/**
 * Process Delivery Settlement (Payout)
 */
export const processDeliverySettlement = asyncHandler(async (req: Request, res: Response) => {
  const { deliveryBoyId, amount, paymentMethod, referenceId, notes } = req.body;

  if (!deliveryBoyId || !amount || amount < 1) {
    return res.status(400).json({
      success: false,
      message: 'Delivery boy ID and amount (min ₹1) are required'
    });
  }

  const deliveryBoy = await Delivery.findById(deliveryBoyId);
  if (!deliveryBoy) {
    return res.status(404).json({
      success: false,
      message: 'Delivery boy not found'
    });
  }

  // Check delivery boy's balance
  if (amount > deliveryBoy.balance) {
    return res.status(400).json({
      success: false,
      message: `Amount exceeds delivery boy's wallet balance (₹${deliveryBoy.balance.toFixed(2)})`
    });
  }

  // Create Payout Transaction
  const transaction = await WalletTransaction.create({
    userId: deliveryBoy._id,
    userType: 'DELIVERY_BOY',
    amount: amount,
    type: 'Debit',
    description: notes || `Payout via ${paymentMethod}`,
    status: 'Completed',
    reference: referenceId || `DPAY-${Date.now()}`,
  });

  // Update Delivery Boy Balance
  deliveryBoy.balance -= amount;
  await deliveryBoy.save();

  // Update Platform Wallet
  const platformWallet = await PlatformWallet.getWallet();
  platformWallet.currentPlatformBalance -= amount;
  platformWallet.deliveryBoyPendingPayouts -= amount;
  await platformWallet.save();

  return res.status(200).json({
    success: true,
    message: 'Payout processed successfully',
    data: transaction
  });
});

