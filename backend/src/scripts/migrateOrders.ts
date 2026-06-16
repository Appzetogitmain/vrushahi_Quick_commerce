import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Order from '../models/Order';

const migrateOrders = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        const orders = await Order.find({ orderNumber: { $regex: /^ORD\d{16}/ } }); // Find long order numbers
        console.log(`Found ${orders.length} orders with long IDs to migrate.`);

        for (const order of orders) {
            const random8Digits = Math.floor(10000000 + Math.random() * 90000000).toString();
            order.orderNumber = `ORD-${random8Digits}`;
            await order.save({ validateBeforeSave: false });
            console.log(`Migrated order _id: ${order._id} to new orderNumber: ${order.orderNumber}`);
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

migrateOrders();
