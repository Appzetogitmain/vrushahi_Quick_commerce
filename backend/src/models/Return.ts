
import mongoose, { Document, Schema } from "mongoose";

export interface IReturn extends Document {
  order: mongoose.Types.ObjectId;
  orderItem: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;

  // Return Info
  reason: string;
  description?: string;
  status: "Pending" | "Approved" | "Rejected" | "Processing" | "Completed";

  // Items
  quantity: number;
  images?: string[]; // Images of returned items

  // Processing
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  rejectionReason?: string;

  // Pickup
  pickupScheduled?: Date;
  pickupCompleted?: Date;
  pickupAddress?: {
    address: string;
    city: string;
    pincode: string;
  };

  // Refund
  refundAmount?: number;
  refundId?: mongoose.Types.ObjectId;
  refundMethod?: "Wallet" | "Original Payment Source" | "Bank" | "UPI";
  refundStatus?: "Pending" | "Processing" | "Refunded" | "Failed";
  refundedAt?: Date;
  refundReference?: string;
  refundedBy?: mongoose.Types.ObjectId;

  // Delivery & QC Tracking
  deliveryBoy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  pickupStatus?: "Pending" | "Assigned" | "Picked Up" | "Returned to Seller" | "QC Failed" | "Unassigned";
  productCustody?: "With Customer" | "With Rider" | "With Seller";
  qcStatus?: "Pending" | "Passed" | "Failed";
  qcNotes?: string;
  riderImages?: string[];
  customerOtp?: string;
  customerOtpVerified?: boolean;
  sellerOtp?: string;
  sellerOtpVerified?: boolean;
  returnPickupFee?: number;
  riderPayoutProcessed?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ReturnSchema = new Schema<IReturn>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    orderItem: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: [true, "Order item is required"],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },

    // Return Info
    reason: {
      type: String,
      required: [true, "Return reason is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Processing", "Completed"],
      default: "Pending",
    },

    // Items
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    images: {
      type: [String],
      default: [],
    },

    // Processing
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    processedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Pickup
    pickupScheduled: {
      type: Date,
    },
    pickupCompleted: {
      type: Date,
    },
    pickupAddress: {
      address: String,
      city: String,
      pincode: String,
    },

    // Refund
    refundAmount: {
      type: Number,
      min: [0, "Refund amount cannot be negative"],
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: "Refund",
    },
    refundMethod: {
      type: String,
      enum: ["Wallet", "Original Payment Source", "Bank", "UPI"],
      default: "Wallet",
    },
    refundStatus: {
      type: String,
      enum: ["Pending", "Processing", "Refunded", "Failed"],
      default: "Pending",
    },
    refundedAt: {
      type: Date,
    },
    refundReference: {
      type: String,
      trim: true,
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },

    // Delivery & QC Tracking
    deliveryBoy: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
    },
    assignedAt: {
      type: Date,
    },
    pickupStatus: {
      type: String,
      enum: ["Pending", "Assigned", "Picked Up", "Returned to Seller", "QC Failed", "Unassigned"],
      default: "Pending",
    },
    productCustody: {
      type: String,
      enum: ["With Customer", "With Rider", "With Seller"],
      default: "With Customer",
    },
    qcStatus: {
      type: String,
      enum: ["Pending", "Passed", "Failed"],
      default: "Pending",
    },
    qcNotes: {
      type: String,
      trim: true,
    },
    riderImages: {
      type: [String],
      default: [],
    },
    customerOtp: {
      type: String,
    },
    customerOtpVerified: {
      type: Boolean,
      default: false,
    },
    sellerOtp: {
      type: String,
    },
    sellerOtpVerified: {
      type: Boolean,
      default: false,
    },
    returnPickupFee: {
      type: Number,
      default: 0,
    },
    riderPayoutProcessed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReturnSchema.index({ order: 1 });
ReturnSchema.index({ customer: 1 });
ReturnSchema.index({ status: 1 });

const Return = mongoose.model<IReturn>("Return", ReturnSchema);

export default Return;
