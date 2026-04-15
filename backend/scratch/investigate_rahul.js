const mongoose = require('mongoose');
const Delivery = require('../dist/models/Delivery').default;
const Order = require('../dist/models/Order').default;
const DeliveryTracking = require('../dist/models/DeliveryTracking').default;

const mongoUri = 'mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0';

async function investigateRahul() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        let rahul;
        
        // 1. Try search by mobile
        rahul = await Delivery.findOne({ mobile: '7846940429' });
        
        if (!rahul) {
           console.log('Searching by name/partial ID...');
           const allDeliveries = await Delivery.find({});
           rahul = allDeliveries.find(d => 
               d.name.includes('Rahul') || 
               d._id.toString().startsWith('7be775') ||
               d.mobile === '7846940429'
           );
        }

        console.log('--- Rahul Profile ---');
        if (rahul) {
            console.log(JSON.stringify(rahul, null, 2));

            // Check for busy status
            const activeOrders = await Order.find({ 
                deliveryBoy: rahul._id, 
                deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
                status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
            });
            console.log('\n--- Rahul Active/Busy Orders ---');
            console.log(JSON.stringify(activeOrders, null, 2));

            // Check latest tracking
            const latestTracking = await DeliveryTracking.findOne({ deliveryBoy: rahul._id }).sort({ updatedAt: -1 });
            console.log('\n--- Rahul Latest Tracking ---');
            console.log(JSON.stringify(latestTracking, null, 2));
        } else {
            console.log('Rahul not found in database');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

investigateRahul();
