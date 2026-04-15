const mongoose = require('mongoose');
const Delivery = require('../dist/models/Delivery').default;
const Order = require('../dist/models/Order').default;

const mongoUri = 'mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0';

async function clearOrders() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const vishalId = '694550f670edfa22e003c6a1';
        const rahulId = '6954d5e92bb5b0cf9b7be775';

        const result = await Order.updateMany(
            { 
                deliveryBoy: { $in: [vishalId, rahulId] },
                status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
            },
            {
                $set: {
                    status: 'Delivered',
                    deliveryBoyStatus: 'Delivered',
                    deliveredAt: new Date(),
                    deliveryOtpVerified: true
                }
            }
        );

        console.log(`Successfully updated ${result.modifiedCount} orders to Delivered status.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

clearOrders();
