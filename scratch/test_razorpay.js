
const Razorpay = require('razorpay');
require('dotenv').config({ path: 'backend/.env' });

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID?.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET?.trim(),
});

async function test() {
    try {
        console.log('Testing Razorpay with Key:', process.env.RAZORPAY_KEY_ID);
        const order = await razorpay.orders.create({
            amount: 100, // 1 INR
            currency: 'INR',
            receipt: 'test_receipt_' + Date.now()
        });
        console.log('Success:', order.id);
    } catch (error) {
        console.error('Failure:', JSON.stringify(error, null, 2));
    }
}

test();
