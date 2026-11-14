import api from './config';

export interface Coupon {
    _id: string;
    code: string;
    title: string;
    description: string;
    discountType: 'Percentage' | 'Fixed';
    discountValue: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    validFrom: string;
    validUntil: string;
    usageLimit?: number;
    usedCount: number;
    isActive: boolean;
}

export interface ValidateCouponResponse {
    success: boolean;
    data?: {
        isValid: boolean;
        coupon: Coupon;
        discountAmount: number;
        finalTotal: number;
    };
    message?: string;
}

export interface GetCouponsResponse {
    success: boolean;
    data: Coupon[];
}

/**
 * Get all available coupons
 */
// Backend uses minimumPurchase / maximumDiscount / startDate / endDate / usageCount
const normalizeCoupon = (c: any): Coupon => ({
    ...c,
    title: c.title || c.description || c.code,
    description: c.description || '',
    minOrderValue: c.minOrderValue ?? c.minimumPurchase,
    maxDiscountAmount: c.maxDiscountAmount ?? c.maximumDiscount,
    validFrom: c.validFrom ?? c.startDate,
    validUntil: c.validUntil ?? c.endDate,
    usedCount: c.usedCount ?? c.usageCount ?? 0,
});

export const getCoupons = async (): Promise<GetCouponsResponse> => {
    const response = await api.get<GetCouponsResponse>('/customer/coupons');
    const data = response.data;
    return { ...data, data: Array.isArray(data?.data) ? data.data.map(normalizeCoupon) : [] };
};

/**
 * Validate a coupon code
 */
export const validateCoupon = async (code: string, orderTotal: number): Promise<ValidateCouponResponse> => {
    const response = await api.post<ValidateCouponResponse>('/customer/coupons/validate', {
        code,
        orderTotal
    });
    return response.data;
};
