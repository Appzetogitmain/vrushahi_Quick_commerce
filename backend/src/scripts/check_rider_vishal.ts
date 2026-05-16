import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Return from '../models/Return';
import Order from '../models/Order';

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI missing');
            return;
        }

        Order.init();

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const recentReturns = await Return.find().sort({ createdAt: -1 }).limit(5).populate('order');

        console.log('Recent Returns count:', recentReturns.length);
        for (const r of recentReturns) {
            const order: any = r.order;
            console.log('--- Return ID:', r._id.toString(), 'Status:', r.status);
            if (order) {
                console.log('Order Number:', order.orderNumber);
                console.log('Customer:', order.customerName);
                console.log('Delivery Address:', JSON.stringify(order.deliveryAddress));
            } else {
                console.log('No order populated');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
