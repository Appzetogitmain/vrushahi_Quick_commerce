import { Schema, model, Document, Types } from "mongoose";

export interface ICashCollection extends Document {
    deliveryBoy: Types.ObjectId;
    order?: Types.ObjectId;
    amount: number;
    paymentMode: "Cash" | "UPI" | "Bank Transfer";
    referenceId?: string;
    remark?: string;
    collectedBy?: Types.ObjectId;
    collectedAt?: Date;
    paymentScreenshot?: string;
    utrNumber?: string;
    type: "Direct" | "Online" | "Offline";
    status: "Pending" | "Completed" | "Rejected";
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const cashCollectionSchema = new Schema<ICashCollection>(
    {
        deliveryBoy: {
            type: Schema.Types.ObjectId,
            ref: "Delivery",
            required: [true, "Delivery boy is required"],
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: false,
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        paymentMode: {
            type: String,
            enum: ["Cash", "UPI", "Bank Transfer"],
            default: "Cash",
        },
        type: {
            type: String,
            enum: ["Direct", "Online", "Offline"],
            default: "Direct",
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Rejected"],
            default: "Completed",
        },
        paymentScreenshot: {
            type: String,
            trim: true,
        },
        utrNumber: {
            type: String,
            trim: true,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
        referenceId: {
            type: String,
            trim: true,
        },
        remark: {
            type: String,
            trim: true,
        },
        collectedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: false,
        },
        collectedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
cashCollectionSchema.index({ deliveryBoy: 1, collectedAt: -1 });
cashCollectionSchema.index({ order: 1 });
cashCollectionSchema.index({ collectedAt: -1 });

const CashCollection = model<ICashCollection>(
    "CashCollection",
    cashCollectionSchema
);

export default CashCollection;
