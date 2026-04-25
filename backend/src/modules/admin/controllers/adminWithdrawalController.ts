import { Request, Response } from 'express';
import WithdrawRequest from '../../../models/WithdrawRequest';
import mongoose from 'mongoose';

/**
 * Get all withdrawal requests with filters and search
 */
export const getAllWithdrawals = async (req: Request, res: Response) => {
    try {
        const { status, userType, search, startDate, endDate, page = 1, limit = 20 } = req.query;

        const query: any = {};
        if (status) {
            if (status === 'Approved') {
                query.status = { $in: ['Approved', 'Completed'] };
            } else {
                query.status = status;
            }
        }
        if (userType) query.userType = userType;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        // Search filter (Request ID or User Name - handle after population or via aggregation)
        // For simplicity with find(), we'll filter by ID if search looks like an ID
        if (search && mongoose.Types.ObjectId.isValid(search as string)) {
            query._id = search;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const requests = await WithdrawRequest.find(query)
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await WithdrawRequest.countDocuments(query);

        // Manually populate user details and current balance
        const sellerIds: any[] = [];
        const deliveryIds: any[] = [];

        requests.forEach(r => {
            if (r.userType === 'SELLER') sellerIds.push(r.userId);
            else if (r.userType === 'DELIVERY_BOY') deliveryIds.push(r.userId);
        });

        const [sellers, deliveryBoys] = await Promise.all([
            mongoose.model('Seller').find({ _id: { $in: sellerIds } }).select('sellerName storeName email mobile accountNumber bankName ifscCode balance'),
            mongoose.model('Delivery').find({ _id: { $in: deliveryIds } }).select('name firstName lastName email mobile accountNumber bankName ifscCode balance')
        ]);

        const sellerMap = new Map(sellers.map(s => [s._id.toString(), s]));
        const deliveryMap = new Map(deliveryBoys.map(d => [d._id.toString(), d]));

        let formattedRequests = requests.map((r: any) => {
            let user: any = null;
            if (r.userType === 'SELLER') {
                user = sellerMap.get(r.userId.toString());
            } else if (r.userType === 'DELIVERY_BOY') {
                user = deliveryMap.get(r.userId.toString());
            }

            const requestObj = r.toObject();
            requestObj.userId = user || r.userId;
            requestObj.availableBalance = user?.balance || 0;
            return requestObj;
        });

        // Filter by search name if search is provided and not an ID
        if (search && !mongoose.Types.ObjectId.isValid(search as string)) {
            const searchLower = (search as string).toLowerCase();
            formattedRequests = formattedRequests.filter(r => {
                const name = r.userId?.sellerName || r.userId?.storeName || r.userId?.name || r.userId?.firstName || '';
                return name.toLowerCase().includes(searchLower);
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                requests: formattedRequests,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        console.error('Error getting withdrawal requests:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get withdrawal requests',
        });
    }
};

/**
 * Get withdrawal statistics for summary cards
 */
export const getWithdrawalStats = async (_req: Request, res: Response) => {
    try {
        const stats = await WithdrawRequest.aggregate([
            {
                $facet: {
                    totalRequests: [{ $count: 'count' }],
                    pendingRequests: [
                        { $match: { status: 'Pending' } },
                        { $count: 'count' }
                    ],
                    approvedAmount: [
                        { $match: { status: { $in: ['Approved', 'Completed'] } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    rejectedRequests: [
                        { $match: { status: 'Rejected' } },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const result = {
            totalRequests: stats[0].totalRequests[0]?.count || 0,
            pendingRequests: stats[0].pendingRequests[0]?.count || 0,
            approvedAmount: stats[0].approvedAmount[0]?.total || 0,
            rejectedRequests: stats[0].rejectedRequests[0]?.count || 0
        };

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error getting withdrawal stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get withdrawal stats',
        });
    }
};

/**
 * Approve withdrawal request (Process Payout)
 */
export const approveWithdrawal = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { transactionReference, remarks } = req.body;
        const adminId = (req as any).user!.userId;

        if (!transactionReference) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Transaction reference is required for approval',
            });
        }

        const request = await WithdrawRequest.findById(id).session(session);
        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
            });
        }

        if (request.status !== 'Pending') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot approve ${request.status.toLowerCase()} request`,
            });
        }

        // Validate available balance before approval
        let userModel: any;
        if (request.userType === 'SELLER') {
            userModel = mongoose.model('Seller');
        } else if (request.userType === 'DELIVERY_BOY') {
            userModel = mongoose.model('Delivery');
        }

        const user = await userModel.findById(request.userId).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.balance < request.amount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ₹${user.balance}, Requested: ₹${request.amount}`
            });
        }

        // Deduct from user wallet
        user.balance -= request.amount;
        await user.save({ session });

        // Create Wallet Transaction (Ledger Entry)
        const WalletTransaction = mongoose.model('WalletTransaction');
        await WalletTransaction.create([{
            userId: request.userId,
            userType: request.userType,
            amount: request.amount,
            type: 'Debit',
            description: `WITHDRAWAL_APPROVED - Ref: ${transactionReference}`,
            status: 'Completed',
            reference: `WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date()
        }], { session });

        // Update Platform Wallet tracking
        try {
            const PlatformWallet = mongoose.model('PlatformWallet') as any;
            const platformWallet = await PlatformWallet.getWallet();
            if (platformWallet) {
                platformWallet.currentPlatformBalance -= request.amount;
                if (request.userType === 'SELLER') {
                    platformWallet.sellerPendingPayouts -= request.amount;
                } else {
                    platformWallet.deliveryBoyPendingPayouts -= request.amount;
                }
                await platformWallet.save({ session });
            }
        } catch (pwError) {
            console.error("Error updating platform wallet:", pwError);
        }

        // Update request status
        request.status = 'Approved';
        request.transactionReference = transactionReference;
        request.remarks = remarks || request.remarks;
        request.processedBy = new mongoose.Types.ObjectId(adminId);
        request.processedAt = new Date();
        await request.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: 'Withdrawal approved and processed successfully',
            data: request,
        });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error approving withdrawal:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve withdrawal',
        });
    } finally {
        session.endSession();
    }
};

/**
 * Reject withdrawal request
 */
export const rejectWithdrawal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const adminId = (req as any).user!.userId;

        if (!remarks) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required',
            });
        }

        const request = await WithdrawRequest.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
            });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject ${request.status.toLowerCase()} request`,
            });
        }

        request.status = 'Rejected';
        request.processedBy = new mongoose.Types.ObjectId(adminId);
        request.processedAt = new Date();
        request.remarks = remarks;
        await request.save();

        return res.status(200).json({
            success: true,
            message: 'Withdrawal request rejected successfully',
            data: request,
        });
    } catch (error: any) {
        console.error('Error rejecting withdrawal:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to reject withdrawal',
        });
    }
};

/**
 * Complete withdrawal request (Legacy - redirects to approve if needed or kept for compatibility)
 */
export const completeWithdrawal = async (_req: Request, res: Response) => {
    // Since we merged the logic into approveWithdrawal as per user request,
    // this can either be removed or just return success if already approved.
    return res.status(200).json({
        success: true,
        message: 'Withdrawal already processed during approval',
    });
};
