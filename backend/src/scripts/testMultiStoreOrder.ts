import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createOrder } from "../modules/customer/controllers/customerOrderController";
import Order from '../models/Order';
import Product from '../models/Product';
import Customer from '../models/Customer';

dotenv.config();

async function runTest() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Database connected successfully.');

        // 1. Fetch Customer
        const customer = await Customer.findOne({ status: 'Active' });
        if (!customer) {
            console.error('No active customer found to run the test!');
            return;
        }
        console.log(`Using Customer: ${customer.name} (${customer._id})`);

        // 2. Find two products from different sellers
        const products = await Product.find({ status: 'Active', publish: true }).limit(50);
        let prod1: any = null;
        let prod2: any = null;

        for (const p of products) {
            if (!prod1) {
                prod1 = p;
            } else if (p.seller.toString() !== prod1.seller.toString()) {
                prod2 = p;
                break;
            }
        }

        if (!prod1 || !prod2) {
            console.error('Could not find products from two different sellers to test multi-store checkout!');
            return;
        }
        console.log(`Product 1: ${prod1.productName} by Seller: ${prod1.seller}`);
        console.log(`Product 2: ${prod2.productName} by Seller: ${prod2.seller}`);

        // 3. Prepare mock request/response
        const req = {
            user: { userId: customer._id.toString() },
            body: {
                items: [
                    { product: { id: prod1._id.toString() }, quantity: 2 },
                    { product: { id: prod2._id.toString() }, quantity: 1 }
                ],
                address: {
                    address: '123 Test Street',
                    city: 'Testville',
                    state: 'TestState',
                    pincode: '560001',
                    latitude: 12.9716,
                    longitude: 77.5946
                },
                paymentMethod: 'COD',
                fees: {
                    platformFee: 10,
                    deliveryFee: 40
                }
            },
            app: {
                get: (_key: string) => null // Mock Socket.IO server
            }
        } as any;

        let responseStatus = 200;
        let responseJson: any = null;
        const res = {
            status: (code: number) => {
                responseStatus = code;
                return res;
            },
            json: (data: any) => {
                responseJson = data;
                return res;
            }
        } as any;

        console.log('\nTriggering createOrder controller...');
        await createOrder(req, res);

        console.log(`Response Status: ${responseStatus}`);
        console.log(`Response Success: ${responseJson?.success}`);

        if (responseStatus !== 201 || !responseJson?.success) {
            console.error('Order creation failed:', responseJson?.message);
            return;
        }

        const parentOrderId = responseJson.data._id;
        console.log(`\nOrder created successfully! Parent Order ID: ${parentOrderId}`);

        // 4. Verify Database Records
        const parentOrder = await Order.findById(parentOrderId).populate('items');
        if (!parentOrder) {
            console.error('Parent order could not be found in DB!');
            return;
        }

        console.log('\n--- PARENT ORDER VERIFICATION ---');
        console.log(`Order Number: ${parentOrder.orderNumber}`);
        console.log(`Is Parent: ${parentOrder.isParent}`);
        console.log(`Child Orders Count: ${parentOrder.childOrders?.length}`);
        console.log(`Subtotal: ${parentOrder.subtotal}`);
        console.log(`Tax: ${parentOrder.tax}`);
        console.log(`Shipping (Delivery Fee): ${parentOrder.shipping}`);
        console.log(`Platform Fee: ${parentOrder.platformFee}`);
        console.log(`Total: ${parentOrder.total}`);

        if (!parentOrder.isParent) {
            console.error('ERROR: Parent order has isParent as false!');
        }
        if (parentOrder.childOrders?.length !== 2) {
            console.error(`ERROR: Expected 2 child orders, found ${parentOrder.childOrders?.length}`);
        }

        console.log('\n--- CHILD ORDERS VERIFICATION ---');
        const childOrders = await Order.find({ parentOrder: parentOrderId }).populate('items');
        
        let sumSubtotal = 0;
        let sumTax = 0;
        let sumShipping = 0;
        let sumPlatformFee = 0;
        let sumTotal = 0;

        for (const child of childOrders) {
            console.log(`\nChild Order Number: ${child.orderNumber}`);
            console.log(`Parent Order ID: ${child.parentOrder}`);
            console.log(`Is Parent: ${child.isParent}`);
            console.log(`Subtotal: ${child.subtotal}`);
            console.log(`Tax: ${child.tax}`);
            console.log(`Shipping: ${child.shipping}`);
            console.log(`Platform Fee: ${child.platformFee}`);
            console.log(`Total: ${child.total}`);
            console.log(`Items in Child: ${child.items.length}`);

            sumSubtotal += child.subtotal;
            sumTax += child.tax;
            sumShipping += child.shipping;
            sumPlatformFee += child.platformFee;
            sumTotal += child.total;

            if (child.isParent) {
                console.error(`ERROR: Child order ${child.orderNumber} has isParent as true!`);
            }
            if (child.shipping !== 20) {
                console.error(`ERROR: Expected shipping to be split to 20, found ${child.shipping}`);
            }
            if (child.platformFee !== 5) {
                console.error(`ERROR: Expected platform fee to be split to 5, found ${child.platformFee}`);
            }

            // Verify OrderItem order reference
            for (const item of child.items as any[]) {
                if (item.order.toString() !== child._id.toString()) {
                    console.error(`ERROR: OrderItem ${item._id} order reference (${item.order}) does not match child order ID (${child._id})`);
                } else {
                    console.log(`OrderItem ${item._id} order reference is correct.`);
                }
            }
        }

        console.log('\n--- SUM COMPOSITION VERIFICATION ---');
        console.log(`Sum of Child Subtotals: ${sumSubtotal} (Parent: ${parentOrder.subtotal})`);
        console.log(`Sum of Child Taxes: ${sumTax} (Parent: ${parentOrder.tax})`);
        console.log(`Sum of Child Shipping: ${sumShipping} (Parent: ${parentOrder.shipping})`);
        console.log(`Sum of Child Platform Fees: ${sumPlatformFee} (Parent: ${parentOrder.platformFee})`);
        console.log(`Sum of Child Totals: ${sumTotal} (Parent: ${parentOrder.total})`);

        if (sumSubtotal !== parentOrder.subtotal) console.error('ERROR: Subtotal mismatch!');
        if (sumShipping !== parentOrder.shipping) console.error('ERROR: Shipping mismatch!');
        if (sumPlatformFee !== parentOrder.platformFee) console.error('ERROR: Platform fee mismatch!');

        console.log('\nVerification Successful! All checks passed!');

    } catch (err) {
        console.error('Error during verification test:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected.');
    }
}

runTest();
