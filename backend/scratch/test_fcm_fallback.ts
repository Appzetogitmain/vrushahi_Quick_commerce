
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Force load env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Order from '../src/models/Order';
import Delivery from '../src/models/Delivery';
import { notifyDeliveryBoysOfNewOrder } from '../src/services/orderNotificationService';

// Reference these to avoid TS6133
console.log('Testing with Order model:', Order.modelName);
console.log('Testing Notify function:', typeof notifyDeliveryBoysOfNewOrder);

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('MONGODB_URI missing in .env');
            return;
        }

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // 1. Mock IO server
        const mockIo = {
            sockets: {
                adapter: {
                    rooms: {
                        get: (roomName: string) => {
                            console.log(`Checking room: ${roomName} - Result: Disconnected (Mock)`);
                            return null; // Simulate disconnected
                        }
                    }
                }
            },
            to: (roomName: string) => ({
                emit: (event: string, data: any) => {
                    console.log(`[Mock IO] Emitted ${event} to ${roomName}`);
                }
            })
        };

        // 2. Fetch Vishal Patel's Order (or a sample order)
        // For testing, we just need ANY order and ANY delivery boy ID
        const sampleOrder = await Order.findOne().populate('items');
        if (!sampleOrder) {
            console.error('No order found to test with');
            return;
        }

        // 3. Find Vishal Patel specifically to test
        const vishal = await Delivery.findOne({ mobile: '9111966732' });
        if (!vishal) {
            console.error('Vishal Patel not found');
            return;
        }

        console.log(`\n--- Testing FCM Fallback logic for ${vishal.name} ---`);
        console.log(`Tokens count: ${vishal.fcmTokenMobile?.length || 0} mobile, ${vishal.fcmTokens?.length || 0} web`);

        // We override findDeliveryBoysNearSellerLocations to return Vishal specifically for this test
        // This is a bit tricky with ES modules, so we'll just manually call the logic
        // Or better, let's just trigger the real function and see the logs if we can mock the finding part.
        
        console.log('Note: This test runs the actual notifyDeliveryBoysOfNewOrder function logic.');
        
        // Since we can't easily mock findDeliveryBoysNearSellerLocations globally, 
        // I will just manually call the internal logic to verify it sends FCM.
        
        // BUT wait, I want to see if the function I modified works.
        // I'll call it with the mock IO.
        
        await notifyDeliveryBoysOfNewOrder(mockIo as any, sampleOrder);

        console.log('\n--- Test Completed ---');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
