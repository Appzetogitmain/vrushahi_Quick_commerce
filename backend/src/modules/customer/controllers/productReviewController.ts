// @ts-nocheck

import { Request, Response } from 'express';
import Review from '../../../models/Review';
import Order from '../../../models/Order';
import mongoose from 'mongoose';

// Get reviews for a product (Public)
export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ product: productId, status: 'Approved' })
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({ product: productId, status: 'Approved' });

        // Calculate average rating
        const stats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId), status: 'Approved' } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const avgRating = stats.length > 0 ? stats[0].avgRating : 0;
        const totalReviews = stats.length > 0 ? stats[0].count : 0;

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats: {
                    avgRating: Math.round(avgRating * 10) / 10,
                    totalReviews
                },
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

// Add/Update a review (Protected, must have purchased)
export const addReview = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const {
            productId,
            sellerId,
            deliveryBoyId,
            orderId,
            rating,
            comment,
            title,
            images,
            reviewType = 'Product'
        } = req.body;

        // 1. Verify basic order requirements
        const order = await Order.findOne({
            _id: orderId,
            customer: userId,
            status: 'Delivered'
        });

        if (!order) {
            return res.status(400).json({
                success: false,
                message: 'You can only review from delivered orders.'
            });
        }

        // 2. Type-specific validation & Query construction
        let query: any = { customer: userId, order: orderId, reviewType };

        if (reviewType === 'Product') {
            if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });
            query.product = productId;
        } else if (reviewType === 'Seller') {
            if (!sellerId) return res.status(400).json({ success: false, message: 'Seller ID is required' });
            query.seller = sellerId;
        } else if (reviewType === 'DeliveryBoy') {
            if (!deliveryBoyId) return res.status(400).json({ success: false, message: 'Delivery Boy ID is required' });
            query.deliveryBoy = deliveryBoyId;
        }

        // 3. Check for existing review (Allow Update/Edit)
        const existingReview = await Review.findOne(query);

        if (existingReview) {
            existingReview.rating = rating;
            existingReview.comment = comment;
            existingReview.title = title;
            existingReview.images = images;
            existingReview.status = 'Pending'; // Reset for moderation
            await existingReview.save();

            return res.status(200).json({
                success: true,
                message: `${reviewType} review updated successfully.`,
                data: existingReview
            });
        }

        // 4. Create new review
        const review = await Review.create({
            customer: userId,
            product: reviewType === 'Product' ? productId : undefined,
            seller: reviewType === 'Seller' ? sellerId : undefined,
            deliveryBoy: reviewType === 'DeliveryBoy' ? deliveryBoyId : undefined,
            order: orderId,
            reviewType,
            rating,
            comment,
            title,
            images,
            status: 'Pending',
            isVerifiedPurchase: true
        });

        return res.status(201).json({
            success: true,
            message: `${reviewType} review submitted successfully.`,
            data: review
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error processing review',
            error: error.message
        });
    }
};

// Get reviews for a specific order by customer
export const getOrderReviews = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.userId;

        const reviews = await Review.find({ order: orderId, customer: userId });

        return res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching order reviews',
            error: error.message
        });
    }
};
