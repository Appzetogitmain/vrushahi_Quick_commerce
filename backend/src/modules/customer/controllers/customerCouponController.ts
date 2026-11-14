import { Request, Response } from "express";
import Coupon from "../../../models/Coupon";
import { checkCouponEligibility, calculateCouponDiscount } from "../../../services/couponService";

// Get available coupons
export const getCoupons = async (_req: Request, res: Response) => {
    try {
        const currentDate = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
        }).sort({ endDate: 1 });

        return res.status(200).json({
            success: true,
            data: coupons,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "Error fetching coupons",
            error: error.message,
        });
    }
};

// Validate a coupon code (orderTotal = product subtotal; fees are not discounted)
export const validateCoupon = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const orderTotal = Number(req.body.orderTotal) || 0;
        const userId = (req as any).user?.userId;

        const check = await checkCouponEligibility(code, userId);
        if (!check.success) {
            return res.status(200).json({ success: false, message: check.message });
        }

        const calc = calculateCouponDiscount(check.coupon, orderTotal);
        if (!calc.success) {
            return res.status(200).json({ success: false, message: calc.message });
        }

        return res.status(200).json({
            success: true,
            data: {
                isValid: true,
                coupon: check.coupon,
                discountAmount: calc.discount,
                finalTotal: Math.max(0, orderTotal - calc.discount),
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "Error validating coupon",
            error: error.message,
        });
    }
};
