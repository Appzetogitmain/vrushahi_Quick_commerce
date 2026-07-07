// @ts-nocheck
import { Request, Response } from "express";
import OrderItem from "../../../models/OrderItem";
import Order from "../../../models/Order";
import Customer from "../../../models/Customer";
import { asyncHandler } from "../../../utils/asyncHandler";
import mongoose from "mongoose";

export const getSellerCustomers = asyncHandler(
    async (req: Request, res: Response) => {
        const sellerId = new mongoose.Types.ObjectId((req as any).user.userId);

        // Find orders associated with this seller
        const sellerOrderItems = await OrderItem.find({ seller: sellerId }).select('order');
        const sellerOrderIds = [...new Set(sellerOrderItems.map(item => item.order.toString()))];

        // Find unique customers from these orders
        const customerIds = await Order.distinct("customer", { _id: { $in: sellerOrderIds } });

        // Get customer details
        const customers = await Customer.find({ _id: { $in: customerIds } }).select('name email phone profile');

        // Aggregate total spent or order count per customer
        const customerStats = await Order.aggregate([
            { $match: { _id: { $in: sellerOrderIds.map(id => new mongoose.Types.ObjectId(id)) } } },
            { $group: { _id: "$customer", totalOrders: { $sum: 1 }, totalSpent: { $sum: "$total" } } }
        ]);

        const formattedCustomers = customers.map(customer => {
            const stats = customerStats.find(s => s._id.toString() === customer._id.toString());
            return {
                _id: customer._id,
                name: customer.name || 'Unknown',
                email: customer.email,
                mobile: (customer as any).phone,
                profile: (customer as any).profile,
                totalOrders: stats ? stats.totalOrders : 0,
                totalSpent: stats ? stats.totalSpent : 0
            };
        });

        res.status(200).json({
            success: true,
            data: formattedCustomers
        });
    }
);
