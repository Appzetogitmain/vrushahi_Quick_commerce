import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import { Delivery, Return } from "../models";

dotenv.config();

async function testReturns() {
  await connectDB();
  const deliveryBoy = await Delivery.findOne({ mobile: "9111966732" });
  if (!deliveryBoy) {
    console.log("Rider not found");
    process.exit(1);
  }
  console.log("Rider ID:", deliveryBoy._id);
  
  const allReturns = await Return.find();
  console.log("Total returns in DB:", allReturns.length);
  for (const r of allReturns) {
    console.log(`Return ID: ${r._id} | DB Rider ID: ${r.deliveryBoy} | Status: ${r.status} | Custody: ${r.productCustody} | Qty: ${r.quantity}`);
  }

  const riderReturns = await Return.find({ deliveryBoy: deliveryBoy._id });
  console.log("Rider returns found:", riderReturns.length);
  for (const r of riderReturns) {
    console.log("Found rider return details:", {
      deliveryBoy: r.deliveryBoy,
      productCustody: r.productCustody,
      pickupStatus: r.pickupStatus,
      quantity: r.quantity
    });
  }

  const objectId = new mongoose.Types.ObjectId(deliveryBoy._id.toString());
  console.log("Testing aggregate with objectId:", objectId);

  const returnItemsCount = await Return.aggregate([
      {
          $match: {
              deliveryBoy: objectId,
              $or: [
                  { productCustody: "With Rider" },
                  { pickupStatus: "Picked Up" }
              ]
          }
      },
      {
          $group: {
              _id: null,
              totalQty: { $sum: "$quantity" }
          }
      }
  ]);
  console.log("Aggregate result:", JSON.stringify(returnItemsCount));

  process.exit(0);
}

testReturns();
