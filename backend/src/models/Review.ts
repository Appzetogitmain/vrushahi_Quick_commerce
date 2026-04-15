import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  product?: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  seller?: mongoose.Types.ObjectId;
  deliveryBoy?: mongoose.Types.ObjectId;
  reviewType: "Product" | "Seller" | "DeliveryBoy";

  // Review Content
  rating: number; // 1-5
  title?: string;
  comment?: string;
  images?: string[];

  // Status
  status: "Pending" | "Approved" | "Rejected";
  isVerifiedPurchase: boolean;

  // Helpful
  helpfulCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: false,
    },
    deliveryBoy: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
      required: false,
    },
    reviewType: {
      type: String,
      enum: ["Product", "Seller", "DeliveryBoy"],
      default: "Product",
      required: true,
    },

    // Review Content
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },

    // Status
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },

    // Helpful
    helpfulCount: {
      type: Number,
      default: 0,
      min: [0, "Helpful count cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Static method to calculate average rating
ReviewSchema.statics.calculateAverageRating = async function (targetId: mongoose.Types.ObjectId, reviewType: string) {
  try {
    const stats = await this.aggregate([
      {
        $match: {
          [reviewType === 'Product' ? 'product' : reviewType === 'Seller' ? 'seller' : 'deliveryBoy']: targetId,
          status: { $ne: 'Rejected' } // Count Pending and Approved for now as requested
        }
      },
      {
        $group: {
          _id: null,
          nRating: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    const updateData = {
      reviewsCount: stats.length > 0 ? stats[0].nRating : 0,
      rating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0
    };

    if (reviewType === "Product") {
      await mongoose.model("Product").findByIdAndUpdate(targetId, updateData);
    } else if (reviewType === "Seller") {
      await mongoose.model("Seller").findByIdAndUpdate(targetId, updateData);
    } else if (reviewType === "DeliveryBoy") {
      await mongoose.model("Delivery").findByIdAndUpdate(targetId, updateData);
    }
  } catch (error) {
    console.error("Error calculating average rating:", error);
  }
};

// Middleware to update ratings after save
ReviewSchema.post("save", async function () {
  const ReviewModel = this.constructor as any;
  if (this.reviewType === 'Product' && this.product) {
    await ReviewModel.calculateAverageRating(this.product, 'Product');
  } else if (this.reviewType === 'Seller' && this.seller) {
    await ReviewModel.calculateAverageRating(this.seller, 'Seller');
  } else if (this.reviewType === 'DeliveryBoy' && this.deliveryBoy) {
    await ReviewModel.calculateAverageRating(this.deliveryBoy, 'DeliveryBoy');
  }
});

// Middleware to update ratings after removal
ReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const ReviewModel = mongoose.model("Review") as any;
    if (doc.reviewType === 'Product' && doc.product) {
      await ReviewModel.calculateAverageRating(doc.product, 'Product');
    } else if (doc.reviewType === 'Seller' && doc.seller) {
      await ReviewModel.calculateAverageRating(doc.seller, 'Seller');
    } else if (doc.reviewType === 'DeliveryBoy' && doc.deliveryBoy) {
      await ReviewModel.calculateAverageRating(doc.deliveryBoy, 'DeliveryBoy');
    }
  }
});

const Review = mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
