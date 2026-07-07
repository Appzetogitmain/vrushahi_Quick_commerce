// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import Delivery from "../models/Delivery";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import Customer from "../models/Customer";
import Seller from "../models/Seller";
import Product from "../models/Product";
import Return from "../models/Return";
import Notification from "../models/Notification";

dotenv.config();

async function seedRiderOrders() {
  try {
    await connectDB();

    const mobile = "9111966732";
    const name = "Vishal Patel";

    // 1. Find or create delivery boy
    let deliveryBoy = await Delivery.findOne({ mobile });
    if (!deliveryBoy) {
      console.log(`Creating delivery boy ${name}...`);
      deliveryBoy = await Delivery.create({
        name,
        mobile,
        email: "vishal.patel@vrumarket.com",
        password: "password123",
        status: "Active",
        isOnline: true,
        available: "Available",
        balance: 150,
        cashCollected: 0,
        address: "Vijay Nagar",
        city: "Jabalpur",
        pincode: "482002",
        vehicleType: "Bike",
        vehicleNumber: "MP20 AB 1234",
        settings: {
          notifications: true,
          location: true,
          sound: true
        }
      });
    } else {
      console.log(`Rider ${name} already exists. Updating status to Active and Online.`);
      deliveryBoy.status = "Active";
      deliveryBoy.isOnline = true;
      deliveryBoy.available = "Available";
      await deliveryBoy.save();
    }

    // 2. Find or create unique customers
    const customerData = [
      { name: "Amit Sharma", email: "amit.sharma@example.com", phone: "9827012345" },
      { name: "Priya Patel", email: "priya.patel@example.com", phone: "8120456789" },
      { name: "Vikram Singh", email: "vikram.singh@example.com", phone: "7000123456" },
      { name: "Sneha Gupta", email: "sneha.gupta@example.com", phone: "9425123456" }
    ];

    const seededCustomers = [];
    for (const c of customerData) {
      let cust = await Customer.findOne({ phone: c.phone });
      if (!cust) {
        cust = await Customer.create({
          name: c.name,
          email: c.email,
          phone: c.phone,
          password: "password123",
          status: "Active"
        });
      }
      seededCustomers.push(cust);
    }

    // 3. Find or create seller
    let seller = await Seller.findOne();
    if (!seller) {
      console.log("Creating demo seller...");
      seller = await Seller.create({
        storeName: "Patel Grocery Store",
        email: "patel.grocery@vrumarket.com",
        mobile: "8888899999",
        password: "password123",
        address: "Napier Town",
        city: "Jabalpur",
        pincode: "482001",
        latitude: "23.1685",
        longitude: "79.9340",
        status: "Approved",
        isOnline: true
      });
    }

    // 4. Find or create product
    let product = await Product.findOne({ seller: seller._id });
    if (!product) {
      console.log("Creating demo product...");
      product = await Product.create({
        name: "Premium Basmati Rice",
        description: "High quality long grain rice",
        price: 120,
        discountedPrice: 99,
        stock: 500,
        seller: seller._id,
        category: "Grocery",
        status: "Active",
        sku: "RICE-001"
      });
    }

    // Clear previous mock orders, returns, and notifications for this rider
    console.log("Cleaning previous orders, returns, and notifications for this rider...");
    const previousOrders = await Order.find({ deliveryBoy: deliveryBoy._id });
    const previousOrderIds = previousOrders.map(o => o._id);
    await OrderItem.deleteMany({ order: { $in: previousOrderIds } });
    await Order.deleteMany({ deliveryBoy: deliveryBoy._id });
    await Return.deleteMany({ deliveryBoy: deliveryBoy._id });
    
    // Clean all notifications for this delivery boy
    await Notification.deleteMany({ recipientId: deliveryBoy._id });
    await Notification.deleteMany({ recipientType: "Delivery", title: "Speed" });

    // Helper to create order item and return it
    const createItem = async (prod: any, qty: number, itemStatus: "Pending" | "Shipped" | "Delivered" | "Cancelled" | "Returned") => {
      const tempOrderId = new mongoose.Types.ObjectId();
      const pName = prod.name || (prod as any).productName || "Premium Basmati Rice";
      return await OrderItem.create({
        order: tempOrderId,
        product: prod._id,
        productName: pName,
        unitPrice: prod.discountedPrice || prod.price || 99,
        quantity: qty,
        total: (prod.discountedPrice || prod.price || 99) * qty,
        seller: seller._id,
        status: itemStatus
      });
    };

    console.log("Seeding new orders for Vishal Patel...");

    // Function to generate realistic Order IDs matching ORD-XXXXXXXX
    const genOrderNo = () => `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Order 1: Processed (Pending Pickup)
    const oItem1 = await createItem(product, 2, "Pending");
    const ordNo1 = genOrderNo();
    const order1 = await Order.create({
      orderNumber: ordNo1,
      customer: seededCustomers[0]._id,
      customerName: seededCustomers[0].name,
      customerEmail: seededCustomers[0].email,
      customerPhone: seededCustomers[0].phone,
      deliveryAddress: {
        address: "Flat 402, Shiv Shakti Apartment, Napier Town",
        city: "Jabalpur",
        pincode: "482001",
        landmark: "Near Wright Town Ground",
        latitude: 23.1680,
        longitude: 79.9350
      },
      items: [oItem1._id],
      subtotal: oItem1.total,
      tax: 5,
      shipping: 20,
      platformFee: 2,
      discount: 0,
      total: oItem1.total + 27,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      status: "Processed",
      deliveryBoy: deliveryBoy._id,
      deliveryBoyStatus: "Assigned",
      assignedAt: new Date(),
      sellerPickups: [{
        seller: seller._id,
        pickupOtp: "4321",
        pickupOtpExpiresAt: new Date(Date.now() + 3600000),
        pickupOtpVerified: false
      }],
      deliveryOtp: "5678",
      deliveryOtpExpiresAt: new Date(Date.now() + 3600000)
    });
    oItem1.order = order1._id as any;
    await oItem1.save();

    // Order 2: Out for Delivery (In Transit)
    const oItem2 = await createItem(product, 1, "Shipped");
    const ordNo2 = genOrderNo();
    const order2 = await Order.create({
      orderNumber: ordNo2,
      customer: seededCustomers[1]._id,
      customerName: seededCustomers[1].name,
      customerEmail: seededCustomers[1].email,
      customerPhone: seededCustomers[1].phone,
      deliveryAddress: {
        address: "House 12, Civic Center, Jabalpur",
        city: "Jabalpur",
        pincode: "482002",
        landmark: "Opposite Samdareeya Mall",
        latitude: 23.1650,
        longitude: 79.9300
      },
      items: [oItem2._id],
      subtotal: oItem2.total,
      tax: 5,
      shipping: 20,
      platformFee: 2,
      discount: 10,
      total: oItem2.total + 17,
      paymentMethod: "ONLINE",
      paymentStatus: "Paid",
      status: "Out for Delivery",
      deliveryBoy: deliveryBoy._id,
      deliveryBoyStatus: "In Transit",
      assignedAt: new Date(),
      sellerPickups: [{
        seller: seller._id,
        pickedUpAt: new Date(),
        pickedUpBy: deliveryBoy._id,
        pickupOtpVerified: true
      }],
      deliveryOtp: "1111",
      deliveryOtpExpiresAt: new Date(Date.now() + 3600000)
    });
    oItem2.order = order2._id as any;
    await oItem2.save();

    // Order 3: Delivered (History)
    const oItem3 = await createItem(product, 3, "Delivered");
    const ordNo3 = genOrderNo();
    const order3 = await Order.create({
      orderNumber: ordNo3,
      customer: seededCustomers[2]._id,
      customerName: seededCustomers[2].name,
      customerEmail: seededCustomers[2].email,
      customerPhone: seededCustomers[2].phone,
      deliveryAddress: {
        address: "Rider Colony, Napier Town, Jabalpur",
        city: "Jabalpur",
        pincode: "482001",
        latitude: 23.1670,
        longitude: 79.9320
      },
      items: [oItem3._id],
      subtotal: oItem3.total,
      tax: 10,
      shipping: 25,
      platformFee: 2,
      discount: 0,
      total: oItem3.total + 37,
      paymentMethod: "COD",
      paymentStatus: "Paid",
      status: "Delivered",
      deliveryBoy: deliveryBoy._id,
      deliveryBoyStatus: "Delivered",
      assignedAt: new Date(Date.now() - 7200000),
      deliveredAt: new Date(Date.now() - 3600000),
      sellerPickups: [{
        seller: seller._id,
        pickedUpAt: new Date(Date.now() - 5400000),
        pickedUpBy: deliveryBoy._id,
        pickupOtpVerified: true
      }],
      deliveryOtpVerified: true
    });
    oItem3.order = order3._id as any;
    await oItem3.save();

    // Order 4: Returned (Quantity 3 to match the Return item count!)
    const oItem4 = await createItem(product, 3, "Returned");
    const ordNo4 = genOrderNo();
    const order4 = await Order.create({
      orderNumber: ordNo4,
      customer: seededCustomers[3]._id,
      customerName: seededCustomers[3].name,
      customerEmail: seededCustomers[3].email,
      customerPhone: seededCustomers[3].phone,
      deliveryAddress: {
        address: "Napier Town, Jabalpur",
        city: "Jabalpur",
        pincode: "482001",
        latitude: 23.1670,
        longitude: 79.9320
      },
      items: [oItem4._id],
      subtotal: oItem4.total,
      tax: 5,
      shipping: 20,
      platformFee: 2,
      discount: 0,
      total: oItem4.total + 27,
      paymentMethod: "ONLINE",
      paymentStatus: "Refunded",
      status: "Returned",
      deliveryBoy: deliveryBoy._id,
      deliveryBoyStatus: "Failed",
      assignedAt: new Date(Date.now() - 86400000),
      deliveredAt: new Date(Date.now() - 82800000)
    });
    oItem4.order = order4._id as any;
    await oItem4.save();

    // Seed Return entries (Quantity: 3)
    console.log("Seeding returns...");
    await Return.create({
      order: order4._id,
      orderItem: oItem4._id,
      customer: seededCustomers[3]._id,
      reason: "Damaged item received",
      status: "Approved",
      quantity: 3,
      deliveryBoy: deliveryBoy._id,
      pickupStatus: "Picked Up",
      productCustody: "With Rider",
      qcStatus: "Pending"
    });

    // Seed Notifications
    console.log("Seeding notifications...");
    const notifications = [
      {
        recipientType: "Delivery" as const,
        recipientId: deliveryBoy._id,
        title: "New Order Assigned",
        message: `A new order ${ordNo1} has been assigned to you. Proceed to Patel Grocery Store for pickup.`,
        type: "Order" as const,
        priority: "High" as const,
        isRead: false
      },
      {
        recipientType: "Delivery" as const,
        recipientId: deliveryBoy._id,
        title: "Weekly Incentive Bonanza",
        message: "Complete 15 deliveries this week to earn an extra bonus incentive of ₹500!",
        type: "Info" as const,
        priority: "Medium" as const,
        isRead: false
      },
      {
        recipientType: "Delivery" as const,
        recipientId: deliveryBoy._id,
        title: "Earning Credited",
        message: "Your commission of ₹40.00 for delivering order ORD-47663248 has been credited to your wallet.",
        type: "Payment" as const,
        priority: "Low" as const,
        isRead: true,
        readAt: new Date()
      },
      {
        recipientType: "Delivery" as const,
        recipientId: deliveryBoy._id,
        title: "Police Verification Pending",
        message: "Please upload your police verification form within the deadline to continue receiving orders.",
        type: "Warning" as const,
        priority: "Urgent" as const,
        isRead: false
      }
    ];

    await Notification.insertMany(notifications);

    console.log("✓ Seeding successfully completed!");
    console.log(`  Seeded 4 orders for Rider: ${name} (${mobile})`);
    console.log(`  Order 1: ${ordNo1} | Customer: ${seededCustomers[0].name} (${seededCustomers[0].phone})`);
    console.log(`  Order 2: ${ordNo2} | Customer: ${seededCustomers[1].name} (${seededCustomers[1].phone})`);
    console.log(`  Order 3: ${ordNo3} | Customer: ${seededCustomers[2].name} (${seededCustomers[2].phone})`);
    console.log(`  Order 4: ${ordNo4} | Customer: ${seededCustomers[3].name} (${seededCustomers[3].phone})`);
    console.log(`  Seeded 1 Return record (Quantity: 3) with custody "With Rider"`);
    console.log(`  Seeded 4 realistic notifications (cleaned test "Speed/Hii" notifications)`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding rider orders:", error);
    process.exit(1);
  }
}

seedRiderOrders();
