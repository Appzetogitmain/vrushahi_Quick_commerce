import mongoose from "mongoose";
import Coupon from "../models/Coupon";
import Order from "../models/Order";

export interface CouponLine {
    productId?: string;
    categoryId?: string;
    sellerId?: string;
    total: number;
}

type CouponCheck = { success: boolean; coupon?: any; message?: string };

/**
 * Basic coupon checks that don't depend on cart contents:
 * exists, active, within dates, global usage limit, per-user usage limit.
 */
export const checkCouponEligibility = async (code: string, customerId?: string): Promise<CouponCheck> => {
    if (!code || typeof code !== "string") return { success: false, message: "Coupon code is required" };

    const coupon: any = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!coupon) return { success: false, message: "Invalid coupon code" };

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
        return { success: false, message: "Coupon has expired" };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return { success: false, message: "Coupon usage limit reached" };
    }

    if (coupon.usageLimitPerUser && customerId) {
        const used = await Order.countDocuments({
            customer: new mongoose.Types.ObjectId(customerId),
            couponCode: coupon.code,
            parentOrder: null, // top-level orders only (child store orders share the parent's coupon)
            status: { $nin: ["Cancelled", "Rejected", "Failed"] },
        });
        if (used >= coupon.usageLimitPerUser) {
            return { success: false, message: "You have already used this coupon the maximum number of times" };
        }
    }

    return { success: true, coupon };
};

/**
 * Item subtotal the coupon applies to (respects Category / Product / Seller restrictions)
 */
export const getEligibleSubtotal = (coupon: any, lines: CouponLine[]): number => {
    const ids = (coupon.applicableIds || []).map((id: any) => id.toString());
    const applies = (line: CouponLine) => {
        switch (coupon.applicableTo) {
            case "Category": return !!line.categoryId && ids.includes(line.categoryId);
            case "Product": return !!line.productId && ids.includes(line.productId);
            case "Seller": return !!line.sellerId && ids.includes(line.sellerId);
            default: return true;
        }
    };
    return lines.filter(applies).reduce((s, l) => s + (Number(l.total) || 0), 0);
};

/**
 * Discount for a coupon, given the cart's item subtotal and eligible subtotal.
 * Coupons apply to product value only (not delivery / platform fees).
 */
export const calculateCouponDiscount = (
    coupon: any,
    itemsSubtotal: number,
    eligibleSubtotal: number = itemsSubtotal
): { success: boolean; discount?: number; message?: string } => {
    if (coupon.minimumPurchase && itemsSubtotal < coupon.minimumPurchase) {
        return {
            success: false,
            message: `Add ₹${Math.ceil(coupon.minimumPurchase - itemsSubtotal)} more items to apply this coupon`,
        };
    }
    if (eligibleSubtotal <= 0) {
        return { success: false, message: "This coupon is not applicable to the items in your cart" };
    }

    let discount = 0;
    if (coupon.discountType === "Percentage") {
        discount = (eligibleSubtotal * coupon.discountValue) / 100;
        if (coupon.maximumDiscount && discount > coupon.maximumDiscount) discount = coupon.maximumDiscount;
    } else {
        discount = coupon.discountValue;
    }
    discount = Math.min(discount, eligibleSubtotal);
    return { success: true, discount: Math.round(discount * 100) / 100 };
};

/**
 * Atomically count one use of the coupon. Returns false if the global limit was hit meanwhile.
 */
export const claimCouponUse = async (couponId: any, session?: mongoose.ClientSession | null): Promise<boolean> => {
    const res = await Coupon.updateOne(
        {
            _id: couponId,
            $or: [
                { usageLimit: { $exists: false } },
                { usageLimit: null },
                { usageLimit: 0 },
                { $expr: { $lt: ["$usageCount", "$usageLimit"] } },
            ],
        },
        { $inc: { usageCount: 1 } },
        session ? { session } : {}
    );
    return res.modifiedCount === 1;
};
