import Commission from "../models/Commission";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import Seller from "../models/Seller";
import Delivery from "../models/Delivery";
import AppSettings from "../models/AppSettings";
import { creditWallet } from "./walletManagementService";
import mongoose from "mongoose";
import Category from "../models/Category";
import SubCategory from "../models/SubCategory";
import Product from "../models/Product";
import WalletTransaction from "../models/WalletTransaction";
import PlatformWallet from "../models/PlatformWallet";

/**
 * Get the effective commission rate for a product/item
 * Priority: 1. SubSubCategory -> 2. SubCategory -> 3. Category -> 4. Seller -> 5. Global
 */
export const getOrderItemCommissionRate = async (
    productId: string,
    sellerId?: string
): Promise<number> => {
    try {
        const product = await Product.findById(productId);
        if (!product) return 10; // Default fallback

        // 1. Check SubSubCategory
        if (product.subSubCategory) {
            const subSubCat = await Category.findById(product.subSubCategory);
            if (subSubCat?.commissionRate && subSubCat.commissionRate > 0) {
                return subSubCat.commissionRate;
            }
        }

        // 2. Check SubCategory
        if (product.subcategory) {
            const subCat = await SubCategory.findById(product.subcategory);
            if (subCat?.commissionRate && subCat.commissionRate > 0) {
                return subCat.commissionRate;
            }
        }

        // 3. Check Category
        if (product.category) {
            const cat = await Category.findById(product.category);
            if (cat?.commissionRate && cat.commissionRate > 0) {
                return cat.commissionRate;
            }
        }

        // 4. Check Seller specific rate
        const finalSellerId = sellerId || product.seller.toString();
        const seller = await Seller.findById(finalSellerId);
        if (seller?.commissionRate && seller.commissionRate > 0) {
            return seller.commissionRate;
        }

        // 5. Global Default
        const settings = await AppSettings.findOne();
        return settings?.defaultCommission ?? 10;
    } catch (error) {
        console.error("Error calculating commission rate:", error);
        return 10;
    }
};

/**
 * Get commission rate for a seller
 */
export const getSellerCommissionRate = async (
    sellerId: string,
): Promise<number> => {
    try {
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            throw new Error("Seller not found");
        }

        // Use individual rate if set, otherwise use global default
        if (seller.commissionRate !== undefined && seller.commissionRate !== null) {
            return seller.commissionRate;
        }

        const settings = await AppSettings.findOne();
        return settings && settings.defaultCommission !== undefined
            ? settings.defaultCommission
            : 10;
    } catch (error) {
        console.error("Error getting seller commission rate:", error);
        return 10; // Default fallback
    }
};

/**
 * Get commission rate for a delivery boy
 */
export const getDeliveryBoyCommissionRate = async (
    deliveryBoyId: string,
): Promise<number> => {
    try {
        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            throw new Error("Delivery boy not found");
        }

        // Use individual rate if set, otherwise use global default
        if (
            deliveryBoy.commissionRate !== undefined &&
            deliveryBoy.commissionRate !== null
        ) {
            return deliveryBoy.commissionRate;
        }

        return 5; // Default 5%
    } catch (error) {
        console.error("Error getting delivery boy commission rate:", error);
        return 5; // Default fallback
    }
};

/**
 * Calculate earning for a specific delivery boy for an order
 */
export const calculateDeliveryBoyEarning = async (
    order: any,
    deliveryBoy: any
): Promise<{ amount: number; rate: number; usedDistanceBased: boolean }> => {
    try {
        let commissionAmount = 0;
        let commissionRate = 0;
        let usedDistanceBased = false;

        const settings = await AppSettings.getSettings();
        if (
            settings &&
            settings.deliveryConfig?.isDistanceBased === true &&
            settings.deliveryConfig?.deliveryBoyKmRate &&
            order.deliveryDistanceKm &&
            order.deliveryDistanceKm > 0
        ) {
            commissionRate = settings.deliveryConfig.deliveryBoyKmRate;
            commissionAmount = order.deliveryDistanceKm * commissionRate;
            usedDistanceBased = true;
        }

        if (!usedDistanceBased) {
            // Fallback to percentage based logic
            commissionRate = deliveryBoy?.commissionRate || 5;
            
            // If we don't have the delivery boy object yet, use global default
            if (!deliveryBoy) {
                const settings = await AppSettings.findOne();
                // @ts-ignore
                commissionRate = settings?.deliveryConfig?.defaultDeliveryBoyRate || 5;
            }
            
            commissionAmount = (order.subtotal * commissionRate) / 100;
        }

        return {
            amount: Math.round(commissionAmount * 100) / 100,
            rate: commissionRate,
            usedDistanceBased
        };
    } catch (error) {
        console.error("Error calculating delivery boy earning:", error);
        return { amount: 0, rate: 0, usedDistanceBased: false };
    }
};

/**
 * Calculate commissions for an order
 */
export const calculateOrderCommissions = async (orderId: string) => {
    try {
        const order = await Order.findById(orderId).populate("items");
        if (!order) {
            throw new Error("Order not found");
        }

        const commissions: {
            seller?: {
                sellerId: string;
                amount: number;
                rate: number;
                orderAmount: number;
            }[];
            deliveryBoy?: {
                deliveryBoyId: string;
                amount: number;
                rate: number;
                orderAmount: number;
            };
        } = {};

        // Calculate seller commissions (per item/seller)
        const sellerCommissions = new Map<
            string,
            { amount: number; rate: number; orderAmount: number }
        >();

        for (const itemId of order.items) {
            const orderItem = await OrderItem.findById(itemId);
            if (!orderItem) continue;

            const sellerId = orderItem.seller.toString();
            const itemTotal = orderItem.total;

            // Get commission rate for this item
            const commissionRate = await getOrderItemCommissionRate(orderItem.product.toString(), sellerId);
            const commissionAmount = (itemTotal * commissionRate) / 100;

            if (sellerCommissions.has(sellerId)) {
                const existing = sellerCommissions.get(sellerId)!;
                existing.amount += commissionAmount;
                existing.orderAmount += itemTotal;
            } else {
                sellerCommissions.set(sellerId, {
                    amount: commissionAmount,
                    rate: commissionRate,
                    orderAmount: itemTotal,
                });
            }
        }

        // Convert to array
        commissions.seller = Array.from(sellerCommissions.entries()).map(
            ([sellerId, data]) => ({
                sellerId,
                ...data,
            }),
        );

        // Calculate delivery boy commission (on order subtotal OR distance based)
        if (order.deliveryBoy) {
            const deliveryBoyId = order.deliveryBoy.toString();
            const deliveryBoy = await Delivery.findById(deliveryBoyId);
            const { amount: commissionAmount, rate: commissionRate, usedDistanceBased } = await calculateDeliveryBoyEarning(order, deliveryBoy);

            commissions.deliveryBoy = {
                deliveryBoyId,
                amount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimals
                rate: commissionRate,
                orderAmount: usedDistanceBased
                    ? order.deliveryDistanceKm || 0
                    : order.subtotal,
            };
        }

        return {
            success: true,
            data: commissions,
        };
    } catch (error: any) {
        console.error("Error calculating order commissions:", error);
        return {
            success: false,
            message: error.message || "Failed to calculate commissions",
        };
    }
};

/**
 * Create Pending Commissions (called on Order Payment)
 */
export const createPendingCommissions = async (orderId: string) => {
    try {
        const order = await Order.findById(orderId).populate("items");
        if (!order) throw new Error("Order not found");

        // Check if commissions already exist
        const existingCommissions = await Commission.find({ order: orderId });
        if (existingCommissions.length > 0) {
            console.log(`Commissions already exist for order ${orderId}`);
            return;
        }

        const items = order.items;

        for (const itemId of items) {
            const item = await OrderItem.findById(itemId);
            if (!item) continue;

            const seller = await Seller.findById(item.seller);
            if (!seller) continue;

            const commissionRate = await getOrderItemCommissionRate(
                item.product.toString(),
                item.seller.toString()
            );
            const commissionAmount = (item.total * commissionRate) / 100;
            const netEarning = item.total - commissionAmount;

            console.log(
                `[Commission] Item: ${item.product}, Rate: ${commissionRate}%, Amount: ${commissionAmount}, Net: ${netEarning}`,
            );

            // Create commission record as PAID immediately for online orders, PENDING for COD
            const isCOD = order.paymentMethod === "COD";

            const commission = await Commission.create({
                order: item.order,
                orderItem: item._id,
                seller: item.seller,
                type: "SELLER",
                orderAmount: item.total,
                commissionRate,
                commissionAmount,
                status: isCOD ? "Pending" : "Paid",
                paidAt: isCOD ? null : new Date(),
            });

            // Credit Wallet Immediately only for non-COD
            if (!isCOD && seller) {
                await creditWallet(
                    seller._id.toString(),
                    "SELLER",
                    netEarning,
                    `Sale proceeds from Order #${order.orderNumber}`,
                    item.order.toString(),
                    commission._id.toString(),
                );
            }
        }

        console.log(`Commissions processed for order ${orderId}`);
    } catch (error) {
        console.error("Error creating commissions:", error);
        throw error;
    }
};

/**
 * Distribute commissions for an order (Pending -> Paid)
 */
export const distributeCommissions = async (orderId: string) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error("Order not found");
        }

        // Check if order is delivered
        if (order.status !== "Delivered") {
            throw new Error(
                "Commissions can only be distributed for delivered orders",
            );
        }

        if (order.paymentMethod && order.paymentMethod.toUpperCase() === "COD") {
            console.log(`[Commission] Delegating COD order ${order.orderNumber} to processCODOrderDelivery`);
            // Commit then end session before calling processCODOrderDelivery which manages its own session
            await session.commitTransaction();
            session.endSession();
            await processCODOrderDelivery(orderId);

            // Fetch the commissions created by processCODOrderDelivery to return them
            const codCommissions = await Commission.find({ order: orderId });

            return {
                success: true,
                message: "COD Commissions processed or already exists",
                data: {
                    commissions: codCommissions,
                },
            };
        }

        // Find Pending commissions (for Online orders)
        const pendingCommissions = await Commission.find({
            order: orderId,
            status: "Pending",
        }).session(session);

        const processedCommissions: any[] = [];

        // Group by Seller to credit wallet once per seller
        const sellerEarnings = new Map<
            string,
            { netAmount: number; commissionIds: string[] }
        >();

        for (const comm of pendingCommissions) {
            // Update status to Paid
            comm.status = "Paid";
            comm.paidAt = new Date();
            await comm.save({ session });
            processedCommissions.push(comm);

            // Group for wallet credit
            if (comm.type === "SELLER" && comm.seller) {
                const sellerId = comm.seller.toString();
                const netAmount = comm.orderAmount - comm.commissionAmount;

                if (!sellerEarnings.has(sellerId)) {
                    sellerEarnings.set(sellerId, { netAmount: 0, commissionIds: [] });
                }
                const data = sellerEarnings.get(sellerId)!;
                data.netAmount += netAmount;
                data.commissionIds.push(comm._id.toString());
            }
        }

        // Credit Seller Wallets
        for (const [sellerId, data] of sellerEarnings.entries()) {
            await creditWallet(
                sellerId,
                "SELLER",
                data.netAmount,
                `Sale proceeds for order ${order.orderNumber}`,
                orderId,
                data.commissionIds[0], // Link to first commission for ref
                session,
            );
        }

        // Handle Delivery Boy Commission (For Prepaid/Online Orders)
        if (order.deliveryBoy) {
            const deliveryBoyId = order.deliveryBoy.toString();
            const existingDeliveryComm = await Commission.findOne({
                order: orderId,
                type: "DELIVERY_BOY",
            }).session(session);

            if (!existingDeliveryComm) {
                console.log(
                    `Creating missing commission for Delivery Boy ${deliveryBoyId}`,
                );

                // Calculate Commission Logic
                let commissionAmount = 0;
                let commissionRate = 0;
                let usedDistanceBased = false;

                try {
                    // @ts-ignore
                    const settings = await AppSettings.getSettings();
                    if (
                        settings &&
                        settings.deliveryConfig?.isDistanceBased === true &&
                        settings.deliveryConfig?.deliveryBoyKmRate &&
                        order.deliveryDistanceKm &&
                        order.deliveryDistanceKm > 0
                    ) {
                        commissionRate = settings.deliveryConfig.deliveryBoyKmRate;
                        commissionAmount = order.deliveryDistanceKm * commissionRate;
                        usedDistanceBased = true;
                    }
                } catch (err) {
                    console.error("Error checking settings for commission:", err);
                }

                if (!usedDistanceBased) {
                    // Fallback to percentage based logic
                    commissionRate = await getDeliveryBoyCommissionRate(deliveryBoyId);
                    commissionAmount = (order.subtotal * commissionRate) / 100;
                }

                // Create Commission Record
                const newComm = await Commission.create(
                    [
                        {
                            order: order._id,
                            deliveryBoy: order.deliveryBoy,
                            type: "DELIVERY_BOY",
                            orderAmount: usedDistanceBased
                                ? order.deliveryDistanceKm || 0
                                : order.subtotal,
                            commissionRate,
                            commissionAmount: Math.round(commissionAmount * 100) / 100,
                            status: "Paid",
                            paidAt: new Date(),
                        },
                    ],
                    { session },
                );

                const comm = newComm[0];
                processedCommissions.push(comm);

                // Credit Wallet Immediately
                await creditWallet(
                    deliveryBoyId,
                    "DELIVERY_BOY",
                    comm.commissionAmount,
                    `Delivery earning for order ${order.orderNumber}`,
                    orderId,
                    comm._id.toString(),
                    session,
                );
            } else if (
                existingDeliveryComm &&
                existingDeliveryComm.status === "Pending"
            ) {
                // If it existed as pending, mark as paid and credit
                existingDeliveryComm.status = "Paid";
                existingDeliveryComm.paidAt = new Date();
                await existingDeliveryComm.save({ session });
                processedCommissions.push(existingDeliveryComm);

                await creditWallet(
                    deliveryBoyId,
                    "DELIVERY_BOY",
                    existingDeliveryComm.commissionAmount,
                    `Delivery earning for order ${order.orderNumber}`,
                    orderId,
                    existingDeliveryComm._id.toString(),
                    session,
                );
            }
        }

        // For Online orders, update Platform Wallet Admin Earnings
        try {
            const platformWallet = await PlatformWallet.getWallet();
            const breakdown = await calculateOrderBreakdown(orderId, session);

            platformWallet.totalAdminEarning += breakdown.totalAdminEarning;
            await platformWallet.save({ session });
        } catch (pwError) {
            console.error("Error updating platform wallet admin earnings in distributeCommissions:", pwError);
        }

        await session.commitTransaction();

        return {
            success: true,
            message: "Commissions distributed successfully",
            data: {
                commissions: processedCommissions,
            },
        };

    } catch (error: any) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error distributing commissions:", error);
        return {
            success: false,
            message: error.message || "Failed to distribute commissions",
        };
    } finally {
        session.endSession();
    }
};

/**
 * Process pending COD commissions when delivery boy pays admin
 */
export const processPendingCODPayouts = async (
    deliveryBoyId: string,
    amountPaid: number,
    session?: mongoose.ClientSession,
) => {
    try {
        // Round amount paid for precision
        let remainingAmount = Math.round(amountPaid * 100) / 100;

        // Find all orders delivered by this delivery boy that have pending SELLER commissions
        const pendingCommissions = await Commission.find({
            type: "SELLER",
            status: "Pending",
        })
            .populate({
                path: "order",
                match: { deliveryBoy: deliveryBoyId, paymentMethod: "COD" },
            })
            .session(session || null)
            .sort({ createdAt: 1 }); // FIFO

        // Filter out commissions where order didn't match the populate criteria
        const validCommissions = pendingCommissions.filter(
            (comm) => comm.order !== null,
        );

        const processedOrders = new Set<string>();
        const PlatformWallet = (await import("../models/PlatformWallet")).default;
        let platformWallet = await PlatformWallet.findOne().session(session || null);

        for (const comm of validCommissions) {
            if (remainingAmount <= 0.01) break; // Use small epsilon

            const order = comm.order as any;

            // Calculate how much this order contributes to the admin payout
            const deliveryComm = await Commission.findOne({
                order: order._id,
                type: "DELIVERY_BOY",
            }).session(session || null);

            if (!deliveryComm) continue;

            // Amount delivery boy owes for this order = Total - Delivery Commission
            const orderAdminPayoutPart = Math.round((order.total - deliveryComm.commissionAmount) * 100) / 100;

            // We process the commission if the amount paid covers this order's part (with small epsilon)
            if (remainingAmount >= orderAdminPayoutPart - 0.01) {
                comm.status = "Paid";
                comm.paidAt = new Date();
                await comm.save({ session });

                // Credit Seller Wallet
                const netEarning = Math.round((comm.orderAmount - comm.commissionAmount) * 100) / 100;
                if (comm.seller) {
                    await creditWallet(
                        comm.seller.toString(),
                        "SELLER",
                        netEarning,
                        `Sale proceeds for COD order ${order.orderNumber} (Delivery boy payout confirmed)`,
                        order._id.toString(),
                        comm._id.toString(),
                        session,
                    );

                    // Update platform wallet counters for this specifically processed order
                    if (platformWallet) {
                        const breakdown = await calculateOrderBreakdown(order._id.toString(), session);

                        platformWallet.totalAdminEarning += breakdown.totalAdminEarning;
                    }
                }

                remainingAmount -= orderAdminPayoutPart;
                processedOrders.add(order.orderNumber);
            }
        }

        if (platformWallet) {
            await platformWallet.save({ session });
        }

        console.log(
            `[COD Payout] Processed ${processedOrders.size} orders for delivery boy ${deliveryBoyId}. Remaining payment: ${remainingAmount}`,
        );

        return {
            success: true,
            processedCount: processedOrders.size,
            remainingAmount: Math.max(0, remainingAmount),
        };
    } catch (error) {
        console.error("Error processing pending COD payouts:", error);
        throw error;
    }
};

/**
 * Get commission summary for a user
 */
export const getCommissionSummary = async (
    userId: string,
    userType: "SELLER" | "DELIVERY_BOY",
) => {
    try {
        const query =
            userType === "SELLER" ? { seller: userId } : { deliveryBoy: userId };

        const commissions = await Commission.find(query).sort({ createdAt: -1 });

        const summary = {
            total: 0,
            paid: 0,
            pending: 0,
            count: commissions.length,
            commissions: commissions.map((c) => ({
                id: c._id,
                orderId: c.order,
                amount: c.commissionAmount,
                rate: c.commissionRate,
                orderAmount: c.orderAmount,
                status: c.status,
                paidAt: c.paidAt,
                createdAt: c.createdAt,
            })),
        };

        commissions.forEach((c) => {
            // For Sellers, earning is Order Amount - Commission Amount
            // For Delivery Boys, earning is the Commission Amount itself
            const earningAmount =
                userType === "SELLER"
                    ? c.orderAmount - c.commissionAmount
                    : c.commissionAmount;

            summary.total += earningAmount;
            if (c.status === "Paid") {
                summary.paid += earningAmount;
            } else if (c.status === "Pending") {
                summary.pending += earningAmount;
            }
        });

        return {
            success: true,
            data: summary,
        };
    } catch (error: any) {
        console.error("Error getting commission summary:", error);
        return {
            success: false,
            message: error.message || "Failed to get commission summary",
        };
    }
};

/**
 * Reverse commissions for a cancelled/returned order
 */
export const reverseCommissions = async (orderId: string) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const commissions = await Commission.find({ order: orderId }).session(
            session,
        );

        if (commissions.length === 0) {
            // No commissions to reverse
            return {
                success: true,
                message: "No commissions to reverse",
            };
        }

        for (const commission of commissions) {
            // Only reverse if status is Paid
            if (commission.status === "Paid") {
                commission.status = "Cancelled";
                await commission.save({ session });

                // Debit from wallet
                const userId =
                    commission.type === "SELLER"
                        ? commission.seller
                        : commission.deliveryBoy;
                const userType = commission.type;

                if (userId) {
                    const { debitWallet } = await import("./walletManagementService");
                    await debitWallet(
                        userId.toString(),
                        userType,
                        commission.commissionAmount,
                        `Commission reversal for cancelled order`,
                        orderId,
                        session,
                    );
                }
            }
        }

        await session.commitTransaction();

        return {
            success: true,
            message: "Commissions reversed successfully",
        };
    } catch (error: any) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error reversing commissions:", error);
        return {
            success: false,
            message: error.message || "Failed to reverse commissions",
        };
    } finally {
        session.endSession();
    }
};

/**
 * COD Order Breakdown Interface
 */
export interface ICODOrderBreakdown {
    orderId: string;
    orderNumber: string;

    // Product breakdown
    productCost: number; // Subtotal of all products
    adminProductCommission: number; // Admin's commission on products
    sellerEarnings: Map<string, number>; // Seller ID -> their earning (product cost - admin commission)

    // Fees
    platformFee: number;

    // Delivery breakdown
    totalDeliveryCharge: number;
    deliveryBoyCommission: number; // Delivery boy's earning from delivery
    adminDeliveryCommission: number; // Admin's portion of delivery charge

    // Totals
    totalAdminEarning: number; // adminProductCommission + platformFee + adminDeliveryCommission
    totalOrderAmount: number; // Grand total customer pays
    amountDeliveryBoyOwesAdmin: number; // Total - deliveryBoyCommission

    // Metadata
    deliveryBoyId?: string;
    deliveryDistanceKm?: number;
}

/**
 * Calculate complete order breakdown
 */
export const calculateOrderBreakdown = async (
    orderId: string,
    session?: mongoose.ClientSession
): Promise<ICODOrderBreakdown> => {
    try {
        const order = await Order.findById(orderId).populate("items").session(session || null);
        if (!order) {
            throw new Error("Order not found");
        }

        const breakdown: ICODOrderBreakdown = {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            productCost: order.subtotal,
            adminProductCommission: 0,
            sellerEarnings: new Map<string, number>(),
            platformFee: order.platformFee || 0,
            totalDeliveryCharge: order.shipping || 0,
            deliveryBoyCommission: 0,
            adminDeliveryCommission: 0,
            totalAdminEarning: 0,
            totalOrderAmount: order.total,
            amountDeliveryBoyOwesAdmin: 0,
            deliveryBoyId: order.deliveryBoy?.toString(),
            deliveryDistanceKm: order.deliveryDistanceKm,
        };

        // 1. Calculate Product Commissions (Admin vs Seller)
        for (const itemId of order.items) {
            const item = await OrderItem.findById(itemId).session(session || null);
            if (!item) continue;

            const product = await Product.findById(item.product).session(session || null);
            if (!product) continue;

            const commissionRate = item.commissionRate || await getOrderItemCommissionRate(
                item.product.toString(),
                item.seller.toString()
            );

            // Calculate commission and seller earning for this item
            const itemCommission = (item.total * commissionRate) / 100;
            const itemSellerEarning = item.total - itemCommission;

            breakdown.adminProductCommission += itemCommission;

            // Aggregate seller earnings
            const sellerId = item.seller.toString();
            const currentEarning = breakdown.sellerEarnings.get(sellerId) || 0;
            breakdown.sellerEarnings.set(sellerId, currentEarning + itemSellerEarning);
        }

        // 2. Calculate Delivery Commission Split
        if (order.deliveryBoy) {
            const settings = await AppSettings.getSettings();

            // Check if distance-based delivery is enabled
            if (
                settings?.deliveryConfig?.isDistanceBased &&
                settings.deliveryConfig.deliveryBoyKmRate &&
                order.deliveryDistanceKm &&
                order.deliveryDistanceKm > 0
            ) {
                // Distance-based calculation
                const deliveryBoyKmRate = settings.deliveryConfig.deliveryBoyKmRate;
                breakdown.deliveryBoyCommission = order.deliveryDistanceKm * deliveryBoyKmRate;

                // Admin gets the rest of the delivery charge
                breakdown.adminDeliveryCommission = breakdown.totalDeliveryCharge - breakdown.deliveryBoyCommission;
            } else {
                // Fallback: If no distance-based config, use percentage of order subtotal
                const deliveryBoy = await Delivery.findById(order.deliveryBoy).session(session || null);
                const deliveryBoyRate = deliveryBoy?.commissionRate || 5;

                breakdown.deliveryBoyCommission = (order.subtotal * deliveryBoyRate) / 100;
                breakdown.adminDeliveryCommission = Math.max(0, breakdown.totalDeliveryCharge);
            }

        } else {
            // No delivery boy assigned, all delivery charge goes to admin
            breakdown.adminDeliveryCommission = breakdown.totalDeliveryCharge;
        }

        // 3. Calculate Total Admin Earning
        breakdown.totalAdminEarning =
            breakdown.adminProductCommission +
            breakdown.platformFee +
            breakdown.adminDeliveryCommission;

        // 4. Calculate Amount Delivery Boy Owes Admin
        breakdown.amountDeliveryBoyOwesAdmin =
            breakdown.totalOrderAmount - breakdown.deliveryBoyCommission;

        return breakdown;
    } catch (error: any) {
        console.error("Error calculating COD order breakdown:", error);
        throw error;
    }
};

/**
 * Process COD Order Delivery
 * Called when a COD order is marked as delivered.
 * NOTE: This function deliberately avoids MongoDB sessions/transactions because:
 * 1. All critical writes use atomic $inc operations
 * 2. Idempotency is guaranteed by the existingTx check
 * 3. Sessions cause write conflicts with creditWallet's internal findByIdAndUpdate
 */
export const processCODOrderDelivery = async (orderId: string): Promise<void> => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (!order.paymentMethod || order.paymentMethod.toUpperCase() !== "COD") {
            console.log(`[COD Delivery] Skipping non-COD order ${order.orderNumber} (Method: ${order.paymentMethod})`);
            return;
        }

        if (!order.deliveryBoy) {
            throw new Error("Order must have a delivery boy assigned");
        }

        const deliveryBoyId = order.deliveryBoy.toString();

        // Idempotency check — skip if already processed
        const existingTx = await WalletTransaction.findOne({
            userId: deliveryBoyId,
            relatedOrder: orderId,
            description: { $regex: /Delivery earning for COD order/i }
        });

        if (existingTx) {
            console.log(`[COD Delivery] Order ${order.orderNumber} already processed. Skipping.`);
            return;
        }

        // Calculate complete breakdown (no session needed)
        const breakdown = await calculateOrderBreakdown(orderId);

        console.log(`[COD Delivery] Processing ${order.orderNumber}: total=${breakdown.totalOrderAmount}, commission=${breakdown.deliveryBoyCommission}, owedToAdmin=${breakdown.amountDeliveryBoyOwesAdmin}`);

        // 1. Update cashCollected and pendingAdminPayout atomically (atomic $inc, no session needed)
        await Delivery.findByIdAndUpdate(
            deliveryBoyId,
            {
                $inc: {
                    cashCollected: breakdown.totalOrderAmount,
                    pendingAdminPayout: breakdown.amountDeliveryBoyOwesAdmin,
                }
            }
        );
        console.log(`[COD Delivery] ✅ Updated rider cashCollected and pendingAdminPayout`);

        // 2. Credit delivery boy's wallet balance (commission earned)
        // creditWallet uses atomic $inc internally — no session passed to avoid write conflicts
        await creditWallet(
            deliveryBoyId,
            "DELIVERY_BOY",
            breakdown.deliveryBoyCommission,
            `Delivery earning for COD order ${order.orderNumber}`,
            orderId,
            undefined,
            undefined,
            true // skipBalanceUpdate: true for COD because rider already has the cash
        );
        console.log(`[COD Delivery] ✅ Credited ₹${breakdown.deliveryBoyCommission} to rider wallet`);

        // 3. Update Platform Wallet
        try {
            const PlatformWallet = (await import("../models/PlatformWallet")).default;
            await PlatformWallet.findOneAndUpdate(
                {},
                { $inc: { pendingFromDeliveryBoy: breakdown.amountDeliveryBoyOwesAdmin } }
            );
        } catch (pwErr) {
            console.error('[COD Delivery] Failed to update platform wallet:', pwErr);
        }

        // 4. Create DELIVERY_BOY Commission Record
        const deliveryCommissionRate = Math.min(
            breakdown.deliveryDistanceKm && breakdown.deliveryDistanceKm > 0
                ? (breakdown.deliveryBoyCommission / breakdown.deliveryDistanceKm)
                : (breakdown.deliveryBoyCommission / (order.subtotal || breakdown.totalOrderAmount || 1)) * 100,
            100 // Cap at 100%
        );

        await Commission.create({
            order: orderId,
            deliveryBoy: order.deliveryBoy,
            type: "DELIVERY_BOY",
            orderAmount: order.subtotal || breakdown.totalOrderAmount,
            commissionRate: deliveryCommissionRate,
            commissionAmount: breakdown.deliveryBoyCommission,
            status: "Paid",
            paidAt: new Date(),
        });
        console.log(`[COD Delivery] ✅ Created DELIVERY_BOY commission record`);

        // 5. Create SELLER Commission Records (Pending — to be paid when admin collects from rider)
        const sellerEarningsArray = Array.from(breakdown.sellerEarnings.entries());
        for (const [sellerId] of sellerEarningsArray) {
            const orderItems = await OrderItem.find({ order: orderId, seller: sellerId });
            for (const item of orderItems) {
                const commRate = item.commissionRate || await getOrderItemCommissionRate(item.product.toString(), item.seller.toString());
                const itemCommission = (item.total * commRate) / 100;

                await Commission.create({
                    order: orderId,
                    orderItem: item._id,
                    seller: sellerId,
                    type: "SELLER",
                    orderAmount: item.total,
                    commissionRate: commRate,
                    commissionAmount: itemCommission,
                    status: "Pending",
                    paidAt: null,
                });
            }
        }
        console.log(`[COD Delivery] ✅ Created SELLER commission records`);

    } catch (error: any) {
        console.error("Error processing COD order delivery:", error);
        throw error;
    }
};


