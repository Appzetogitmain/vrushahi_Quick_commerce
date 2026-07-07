// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order";

dotenv.config();

const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/quick-commerce";

async function run() {
  await mongoose.connect(mongoURI);
  const count = await Order.countDocuments({});
  console.log("Total orders in database:", count);

  const pendingRefunds = await Order.find({ isParent: { $ne: true }, adminRefundStatus: "Pending" });
  console.log("Pending refund orders count:", pendingRefunds.length);
  for (const o of pendingRefunds) {
    console.log(`Order Number: ${o.orderNumber}, isParent: ${o.isParent}, adminRefundStatus: ${o.adminRefundStatus}`);
  }

  await mongoose.disconnect();
}

run();
