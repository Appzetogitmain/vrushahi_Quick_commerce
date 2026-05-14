import mongoose from "mongoose";
import Commission from "../models/Commission";
import Seller from "../models/Seller";
import Return from "../models/Return";
import WalletTransaction from "../models/WalletTransaction";
import BackgroundLock from "../models/BackgroundLock";

/**
 * Acquire distributed lock
 */
const acquireLock = async (key: string, durationMs: number): Promise<boolean> => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs);

    try {
        const result = await BackgroundLock.findOneAndUpdate(
            {
                key,
                $or: [
                    { expiresAt: { $lt: now } } // Lock expired
                ]
            },
            {
                $set: {
                    lockedAt: now,
                    expiresAt: expiresAt
                }
            },
            {
                new: true,
                upsert: true
            }
        );
        return !!result;
    } catch (error) {
        // Unique index violation or findOneAndUpdate mismatch
        return false;
    }
};

/**
 * Release distributed lock
 */
const releaseLock = async (key: string): Promise<void> => {
    try {
        await BackgroundLock.deleteOne({ key });
    } catch (error) {
        console.error(`[EarningsRelease] Failed to release lock ${key}:`, error);
    }
};

/**
 * Scans and releases expired locked commissions to sellers
 */
export const releaseExpiredEarnings = async (): Promise<void> => {
    const lockKey = "EARNINGS_RELEASE_LOCK";
    const lockDuration = 10 * 60 * 1000; // 10 minutes lock duration safety

    const acquired = await acquireLock(lockKey, lockDuration);
    if (!acquired) {
        console.log("[EarningsRelease] Another instance is already running. Skipping execution.");
        return;
    }

    try {
        console.log("[EarningsRelease] Starting background scan for expired seller earnings...");
        const now = new Date();

        // Find all locked commissions that are past their lock duration
        const expiredCommissions = await Commission.find({
            type: "SELLER",
            releaseStatus: "Locked",
            lockExpiresAt: { $lte: now }
        });

        console.log(`[EarningsRelease] Found ${expiredCommissions.length} candidates for release.`);

        for (const comm of expiredCommissions) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Double check commission state inside session
                const lockedComm = await Commission.findById(comm._id).session(session);
                if (!lockedComm || lockedComm.releaseStatus !== "Locked") {
                    await session.abortTransaction();
                    session.endSession();
                    continue;
                }

                // Check if there is an active return request under review for this specific item
                const activeReturn = await Return.findOne({
                    orderItem: lockedComm.orderItem,
                    status: { $in: ["Pending", "Processing", "Approved"] }
                }).session(session);

                if (activeReturn) {
                    console.log(`[EarningsRelease] ❄️ Freezing release for Commission ${lockedComm._id} (Order Item ${lockedComm.orderItem}) due to active Return ${activeReturn._id} (${activeReturn.status})`);
                    await session.abortTransaction();
                    session.endSession();
                    continue;
                }

                // If return is Completed, the commission should be Reversed, not Released
                const completedReturn = await Return.findOne({
                    orderItem: lockedComm.orderItem,
                    status: "Completed"
                }).session(session);

                if (completedReturn) {
                    console.log(`[EarningsRelease] 🔄 Commission ${lockedComm._id} has completed Return ${completedReturn._id}. Setting status to Reversed.`);
                    lockedComm.releaseStatus = "Reversed";
                    await lockedComm.save({ session });
                    await session.commitTransaction();
                    session.endSession();
                    continue;
                }

                // Transition commission to Released
                lockedComm.releaseStatus = "Released";
                lockedComm.releasedAt = now;
                await lockedComm.save({ session });

                // Unlock the corresponding wallet transaction
                await WalletTransaction.findOneAndUpdate(
                    { relatedCommission: lockedComm._id },
                    { $set: { isLocked: false } },
                    { session }
                );

                // Transfer funds from seller's lockedBalance to withdrawable balance
                const netEarning = Math.round((lockedComm.orderAmount - lockedComm.commissionAmount) * 100) / 100;
                const seller = await Seller.findById(lockedComm.seller).session(session);

                if (seller) {
                    seller.lockedBalance = Math.max(0, (seller.lockedBalance || 0) - netEarning);
                    seller.balance = (seller.balance || 0) + netEarning;
                    await seller.save({ session });

                    console.log(`[EarningsRelease] ✅ Released ₹${netEarning} from locked to withdrawable balance for Seller ${seller._id}`);
                }

                await session.commitTransaction();
            } catch (err) {
                await session.abortTransaction();
                console.error(`[EarningsRelease] Failed to release commission ${comm._id}:`, err);
            } finally {
                session.endSession();
            }
        }

        console.log("[EarningsRelease] Scan completed successfully.");
    } catch (error) {
        console.error("[EarningsRelease] Critical error in background worker:", error);
    } finally {
        await releaseLock(lockKey);
    }
};

/**
 * Initializes and starts the background earnings release scheduler
 */
export const startEarningsReleaseWorker = (): void => {
    console.log("[EarningsRelease] Initializing 15-minute background earnings release worker...");
    
    // Execute first run after 1 minute of server startup
    setTimeout(() => {
        releaseExpiredEarnings().catch(err => {
            console.error("[EarningsRelease] Initial scan failed:", err);
        });
    }, 60 * 1000);

    // Schedule regular 15-minute intervals
    setInterval(() => {
        releaseExpiredEarnings().catch(err => {
            console.error("[EarningsRelease] Scheduled scan failed:", err);
        });
    }, 15 * 60 * 1000);
};
