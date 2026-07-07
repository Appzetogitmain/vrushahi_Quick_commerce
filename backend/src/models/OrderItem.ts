import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem extends Document {
  order: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;

  // Product Details (snapshot at time of order)
  productName: string;
  productImage?: string;
  sku?: string;

  // Pricing
  unitPrice: number;
  quantity: number;
  total: number;

  // Variation
  variation?: string;

  // Tax Details
  taxName?: string;
  taxPercentage?: number;
  taxAmount?: number;
  basePrice?: number;

  // Status
  status: "Pending" | "Shipped" | "Delivered" | "Cancelled" | "Returned";

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Seller is required"],
    },

    // Product Details (snapshot)
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    productImage: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },

    // Pricing
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },

    // Variation
    variation: {
      type: String,
      trim: true,
    },

    // Tax Details
    taxName: {
      type: String,
      trim: true,
    },
    taxPercentage: {
      type: Number,
      min: [0, "Tax percentage cannot be negative"],
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: [0, "Tax amount cannot be negative"],
      default: 0,
    },
    basePrice: {
      type: Number,
      min: [0, "Base price cannot be negative"],
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
OrderItemSchema.index({ order: 1 });
OrderItemSchema.index({ product: 1 });
OrderItemSchema.index({ seller: 1 });

const OrderItem = (mongoose.models.OrderItem as mongoose.Model<IOrderItem>) || mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);

export default OrderItem;
