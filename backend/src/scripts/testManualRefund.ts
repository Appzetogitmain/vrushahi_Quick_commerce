import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order";
import Customer from "../models/Customer";
import Admin from "../models/Admin";
import { encrypt, decrypt } from "../utils/encryptionUtils";

dotenv.config();

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/quick-commerce"; // standard local URI

async function runTest() {
  console.log("=== Starting Manual Refund Pipeline Verification ===");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB database.");

    // Create or Find test Admin
    let admin = await Admin.findOne({ email: "admin_tester@example.com" });
    if (!admin) {
      admin = new Admin({
        firstName: "Admin",
        lastName: "Tester",
        email: "admin_tester@example.com",
        mobile: "9999999999",
        password: "hashedpassword123",
        role: "Super Admin",
      });
      await admin.save();
      console.log("Created test admin to receive manual refund notifications.");
    } else {
      console.log("Found existing test admin.");
    }

    // 1. Create or Find test customer
    let customer = await Customer.findOne({ email: "refund_tester@example.com" });
    if (!customer) {
      customer = new Customer({
        name: "Refund Tester",
        email: "refund_tester@example.com",
        phone: "9876543210",
        password: "hashedpassword123",
        bankDetails: {
          accountName: encrypt("Refund Tester Account"),
          accountNumber: encrypt("123456789012"),
          bankName: encrypt("State Bank of India"),
          ifscCode: encrypt("SBIN0001234"),
          upiId: encrypt("tester@upi"),
        },
      });
      await customer.save();
      console.log("Created test customer with encrypted bank/UPI details.");
    } else {
      console.log("Found existing test customer.");
    }

    // 2. Decrypt check
    console.log("Verifying customer bank details encryption/decryption:");
    console.log("Encrypted upiId in DB:", customer.bankDetails?.upiId);
    console.log("Decrypted upiId:", decrypt(customer.bankDetails?.upiId || ""));

    // 3. Create a mockup prepaid online order
    const orderNumber = `ORD-TEST-REF-${Date.now()}`;
    const order = new Order({
      orderNumber,
      customer: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      deliveryAddress: {
        address: "123 Test Street",
        city: "Mumbai",
        pincode: "400001",
      },
      items: [],
      subtotal: 350,
      tax: 18,
      shipping: 30,
      platformFee: 5,
      discount: 0,
      total: 403,
      paymentMethod: "Online",
      paymentStatus: "Paid", // Payment received
      status: "Received", // Active order
      adminRefundStatus: "Not Applicable",
    });

    await order.save();
    console.log(`Placed online order ${orderNumber} (Status: ${order.status}, Payment: ${order.paymentStatus}, Refund Status: ${order.adminRefundStatus})`);

    // 4. Cancel the order to trigger pre-save hook
    order.status = "Cancelled";
    order.cancellationReason = "Test manual refund trigger";
    order.cancelledAt = new Date();
    await order.save();

    console.log(`Order status updated to Cancelled. Saved to database.`);

    // Delay to let the asynchronous notification broadcast finish saving
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Reload from DB to verify hook execution
    const reloadedOrder = await Order.findById(order._id);
    if (!reloadedOrder) throw new Error("Order not found after saving!");

    console.log("Verification of pre-save hook:");
    console.log("Status:", reloadedOrder.status);
    console.log("Payment Status:", reloadedOrder.paymentStatus);
    console.log("Admin Refund Status:", reloadedOrder.adminRefundStatus);

    if (reloadedOrder.adminRefundStatus !== "Pending") {
      throw new Error(`Expected adminRefundStatus to be 'Pending', got '${reloadedOrder.adminRefundStatus}'`);
    }
    console.log("✅ SUCCESS: Pre-save hook correctly marked the online paid cancelled order as Refund Status: 'Pending'.");

    // Verify notification was created
    const Notification = require("../models/Notification").default;
    const notification = await Notification.findOne({
      title: "Pending Manual Refund",
      message: new RegExp(orderNumber)
    });
    if (!notification) {
      throw new Error(`Expected admin notification to be created for order ${orderNumber}`);
    }
    console.log("✅ SUCCESS: Admin broadcast notification verified successfully in database:");
    console.log("   Title:", notification.title);
    console.log("   Message:", notification.message);

    // 5. Simulate manual refund processing
    console.log("\nSimulating admin manual refund processing...");
    reloadedOrder.adminRefundStatus = "Refunded";
    reloadedOrder.paymentStatus = "Refunded";
    reloadedOrder.adminRefundReference = "TXN9876543210-REF";
    reloadedOrder.adminRefundNotes = "Refunded via SBI UPI successfully";
    reloadedOrder.adminRefundedAt = new Date();

    await reloadedOrder.save();
    console.log("Manual refund details saved to database.");

    // Reload to verify final state
    const finalOrder = await Order.findById(order._id);
    if (!finalOrder) throw new Error("Order not found in final step!");

    console.log("\n=== FINAL ORDER STATE ===");
    console.log("Order Number:", finalOrder.orderNumber);
    console.log("Order Status:", finalOrder.status);
    console.log("Payment Status:", finalOrder.paymentStatus);
    console.log("Admin Refund Status:", finalOrder.adminRefundStatus);
    console.log("Refund Reference:", finalOrder.adminRefundReference);
    console.log("Refund Notes:", finalOrder.adminRefundNotes);
    console.log("Refund Date:", finalOrder.adminRefundedAt);

    if (finalOrder.adminRefundStatus !== "Refunded" || finalOrder.paymentStatus !== "Refunded") {
      throw new Error("Final status check failed!");
    }
    console.log("\n✅ SUCCESS: Manual Refund Flow completed successfully!");

  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
    process.exit(0);
  }
}

runTest();
