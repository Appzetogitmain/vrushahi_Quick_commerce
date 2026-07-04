import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerSubscription extends Document {
  seller: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  planName: string;
  amount: number;
  startDate: Date;
  expiryDate: Date;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  transactionId?: string; // Razorpay payment ID
  razorpayOrderId?: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  isRenewal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sellerSubscriptionSchema = new Schema<ISellerSubscription>(
  {
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
    },
    transactionId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Cancelled'],
      default: 'Active',
    },
    isRenewal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const SellerSubscription = mongoose.model<ISellerSubscription>('SellerSubscription', sellerSubscriptionSchema);

export default SellerSubscription;
