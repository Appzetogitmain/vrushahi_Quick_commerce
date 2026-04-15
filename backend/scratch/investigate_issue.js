const mongoose = require('mongoose');
const path = require('path');
const Delivery = require('../dist/models/Delivery').default;
const Order = require('../dist/models/Order').default;
const Seller = require('../dist/models/Seller').default;
const DeliveryTracking = require('../dist/models/DeliveryTracking').default;

const mongoUri = 'mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0';

async function investigate() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const vishal = await Delivery.findOne({ name: /Vishal Patel/i });
        console.log('--- Vishal Patel Profile ---');
        if (vishal) {
            console.log(JSON.stringify(vishal, null, 2));

            // Check for busy status
            const activeOrders = await Order.find({ 
                deliveryBoy: vishal._id, 
                deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
                status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
            });
            console.log('\n--- Vishal Active/Busy Orders ---');
            console.log(JSON.stringify(activeOrders, null, 2));

            // Check latest tracking
            const latestTracking = await DeliveryTracking.findOne({ deliveryBoy: vishal._id }).sort({ updatedAt: -1 });
            console.log('\n--- Vishal Latest Tracking ---');
            console.log(JSON.stringify(latestTracking, null, 2));
        } else {
            console.log('Vishal Patel not found in database');
        }

        const fashionHub = await Seller.findOne({ storeName: /Fashion hub/i });
        console.log('\n--- Fashion Hub Profile ---');
        console.log(JSON.stringify(fashionHub, null, 2));

        // Check if there are any recent orders accepted by this seller
        const recentOrders = await Order.find({ 
            'items.seller': fashionHub?._id,
            status: 'Accepted'
        }).sort({ updatedAt: -1 }).limit(1);
        
        console.log('\n--- Recent Accepted Order for Fashion Hub ---');
        console.log(JSON.stringify(recentOrders, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

investigate();
