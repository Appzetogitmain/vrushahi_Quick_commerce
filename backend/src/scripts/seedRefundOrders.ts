// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order";
import Customer from "../models/Customer";
import { encrypt } from "../utils/encryptionUtils";

dotenv.config();

const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/quick-commerce";

async function seedData() {
  console.log("=== Seeding Pending Refund Sample Data ===");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB.");

    // 1. Create a customer with bank/UPI details if they don't exist
    let customer1 = await Customer.findOne({ email: "rahul.sharma@example.com" });
    if (!customer1) {
      customer1 = new Customer({
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "9876543211",
        password: "hashedpassword123",
        bankDetails: {
          accountName: encrypt("Rahul Sharma Account"),
          accountNumber: encrypt("50100234567890"),
          bankName: encrypt("HDFC Bank"),
          ifscCode: encrypt("HDFC0000240"),
          upiId: encrypt("rahulsharma@okhdfcbank"),
        },
      });
      await customer1.save();
      console.log("Created customer Rahul Sharma with bank details.");
    } else {
      console.log("Found existing customer Rahul Sharma.");
    }

    let customer2 = await Customer.findOne({ email: "priya.patel@example.com" });
    if (!customer2) {
      customer2 = new Customer({
        name: "Priya Patel",
        email: "priya.patel@example.com",
        phone: "9876543212",
        password: "hashedpassword123",
        bankDetails: {
          accountName: encrypt("Priya Patel"),
          accountNumber: encrypt("31234567890"),
          bankName: encrypt("State Bank of India"),
          ifscCode: encrypt("SBIN0000300"),
          upiId: encrypt("priyapatel@oksbi"),
        },
      });
      await customer2.save();
      console.log("Created customer Priya Patel with bank details.");
    } else {
      console.log("Found existing customer Priya Patel.");
    }

    // Remove existing seed orders if any to keep clean
    await Order.deleteMany({ orderNumber: { $in: ["ORD-REF-SEED-1", "ORD-REF-SEED-2"] } });

    // 2. Insert Order 1: Cancelled Online Order
    const order1 = new Order({
      orderNumber: "ORD-REF-SEED-1",
      customer: customer1._id,
      customerName: customer1.name,
      customerEmail: customer1.email,
      customerPhone: customer1.phone,
      deliveryAddress: {
        address: "A-404, Shanti Heights, Andheri West",
        city: "Mumbai",
        pincode: "400053",
      },
      items: [],
      subtotal: 300,
      tax: 15,
      shipping: 30,
      platformFee: 5,
      total: 350,
      paymentMethod: "Online",
      paymentStatus: "Paid",
      status: "Cancelled",
      adminRefundStatus: "Pending",
      orderDate: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    });
    await order1.save();
    console.log("Seeded Order #ORD-REF-SEED-1 (Cancelled by customer).");

    // 3. Insert Order 2: Rejected Online Order
    const order2 = new Order({
      orderNumber: "ORD-REF-SEED-2",
      customer: customer2._id,
      customerName: customer2.name,
      customerEmail: customer2.email,
      customerPhone: customer2.phone,
      deliveryAddress: {
        address: "Flat 12, Rose Villa, Koregaon Park",
        city: "Pune",
        pincode: "411001",
      },
      items: [],
      subtotal: 480,
      tax: 25,
      shipping: 10,
      platformFee: 5,
      total: 520,
      paymentMethod: "Online",
      paymentStatus: "Paid",
      status: "Rejected",
      adminRefundStatus: "Pending",
      orderDate: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    });
    await order2.save();
    console.log("Seeded Order #ORD-REF-SEED-2 (Rejected by seller).");

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedData();
