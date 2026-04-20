
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Force load env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Delivery from '../src/models/Delivery';
import Seller from '../src/models/Seller';
import Order from '../src/models/Order';

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('MONGODB_URI missing in .env');
            return;
        }

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const mobile = '9111966732';
        console.log(`\n--- Investigating Delivery Boy: Vishal Patel (${mobile}) ---`);

        const vishal = await Delivery.findOne({ mobile });

        if (!vishal) {
            console.log('❌ ERROR: Delivery boy not found with this mobile number.');
            
            // Try searching by name or email
            const vishalByName = await Delivery.findOne({ name: /Vishal/i });
            if (vishalByName) {
                console.log('Found someone with name "Vishal":', vishalByName.name, vishalByName.mobile);
            }
            
            const vishalByEmail = await Delivery.findOne({ email: 'mrvishupatel28@gmail.com' });
            if (vishalByEmail) {
                console.log('Found someone with email "mrvishupatel28@gmail.com":', vishalByEmail.name, vishalByEmail.mobile);
            }
            
            return;
        }

        console.log('✅ Found User:', vishal.name);
        console.log('ID:', vishal._id);
        console.log('Email:', vishal.email);
        console.log('Status:', vishal.status, vishal.status === 'Active' ? '✅' : '❌ (Must be Active)');
        console.log('Is Online:', vishal.isOnline, vishal.isOnline ? '✅' : '❌ (Must be Online to receive orders)');
        console.log('Vehicle Number:', vishal.vehicleNumber);
        
        console.log('\n--- Location Info ---');
        console.log('Location:', JSON.stringify(vishal.location));
        if (!vishal.location || !vishal.location.coordinates) {
            console.log('❌ Warning: Location is missing or invalid.');
        } else {
            console.log('Coordinates:', vishal.location.coordinates);
        }

        console.log('\n--- Notification Info ---');
        console.log('FCM Tokens (Web):', vishal.fcmTokens?.length || 0);
        console.log('FCM Tokens (Mobile):', vishal.fcmTokenMobile?.length || 0);
        if ((vishal.fcmTokens?.length || 0) === 0 && (vishal.fcmTokenMobile?.length || 0) === 0) {
            console.log('❌ Warning: No FCM tokens registered. Push notifications will fail.');
        }

        console.log('\n--- Balance Info ---');
        console.log('Balance:', vishal.balance);
        console.log('Cash Collected:', vishal.cashCollected);

        console.log('\n--- Active Orders Info ---');
        const activeOrders = await Order.find({
            deliveryBoy: vishal._id,
            deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
            status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
        });

        if (activeOrders.length > 0) {
            console.log(`❌ Warning: He has ${activeOrders.length} active orders.`);
            activeOrders.forEach(o => {
                console.log(`- Order ID: ${o._id}, Status: ${o.status}, Delivery Status: ${o.deliveryBoyStatus}`);
            });
        } else {
            console.log('✅ No active orders found. He should be eligible for new orders.');
        }

        // Check if there are any sellers nearby
        if (vishal.location && vishal.location.coordinates) {
            const [lng, lat] = vishal.location.coordinates;
            const nearbySellers = await Seller.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [lng, lat]
                        },
                        $maxDistance: 10000 // 10km
                    }
                }
            }).limit(5);

            console.log(`\n--- Nearby Sellers (within 10km) ---`);
            if (nearbySellers.length === 0) {
                console.log('❌ No sellers found within 10km of his last known location.');
            } else {
                nearbySellers.forEach(s => {
                    console.log(`- ${s.storeName} (${(s as any).serviceRadiusKm || 10}km radius)`);
                });
            }
        }

    } catch (error) {
        console.error('Error during investigation:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
