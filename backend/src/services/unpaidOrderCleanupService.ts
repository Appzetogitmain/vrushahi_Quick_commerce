import Razorpay from "razorpay";
import Order from "../models/Order";
import { restoreProductStock } from "./orderService";

const UNPAID_TIMEOUT_MINUTES = 30;

const getRazorpay = () => {
    const key_id = process.env.RAZORPAY_KEY_ID?.trim();
    const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

/**
 * True if Razorpay has any successful/in-progress payment for this app order
 * (checkout orders are created with receipt = our order id).
 */
const hasRazorpayPayment = async (razorpay: any, orderId: string): Promise<boolean> => {
    const res: any = await razorpay.orders.all({ receipt: orderId, count: 10 } as any);
    for (const rzpOrder of res?.items || []) {
        if (rzpOrder.status === "paid" || (rzpOrder.amount_paid || 0) > 0) return true;
        if (rzpOrder.status === "attempted") {
            const payments: any = await razorpay.orders.fetchPayments(rzpOrder.id);
            if ((payments?.items || []).some((p: any) => ["captured", "authorized"].includes(p.status))) return true;
        }
    }
    return false;
};

/**
 * Cancel online orders that were never paid (customer closed Razorpay checkout),
 * and put their reserved stock back.
 */
export const cancelUnpaidOnlineOrders = async () => {
    const razorpay = getRazorpay();
    if (!razorpay) return;

    const cutoff = new Date(Date.now() - UNPAID_TIMEOUT_MINUTES * 60 * 1000);
    const stale = await Order.find({
        paymentMethod: "Online",
        paymentStatus: "Pending",
        status: "Pending",
        parentOrder: null, // top-level orders only; children are handled with their parent
        createdAt: { $lt: cutoff },
    })
        .select("_id orderNumber isParent childOrders")
        .limit(50);

    for (const order of stale) {
        const orderId = order._id.toString();
        try {
            if (await hasRazorpayPayment(razorpay, orderId)) continue; // paid - webhook/verify will finalize it

            // Atomic claim so a payment arriving right now isn't overwritten
            const claimed = await Order.findOneAndUpdate(
                { _id: orderId, paymentStatus: "Pending", status: "Pending" },
                { $set: { status: "Cancelled", paymentStatus: "Failed", cancellationReason: "Payment not completed" } },
                { new: true }
            );
            if (!claimed) continue;

            if ((order as any).isParent && (order as any).childOrders?.length) {
                await Order.updateMany(
                    { _id: { $in: (order as any).childOrders }, status: "Pending" },
                    { $set: { status: "Cancelled", paymentStatus: "Failed", cancellationReason: "Payment not completed" } }
                );
            }

            // Parent keeps the full item list, so restoring on it covers all stores once
            await restoreProductStock(orderId);
            console.log(`[UnpaidCleanup] Cancelled unpaid order ${order.orderNumber} and restored stock`);
        } catch (err: any) {
            console.error(`[UnpaidCleanup] Failed for order ${order.orderNumber}:`, err?.error?.description || err?.message);
        }
    }
};
