const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected to:', process.env.MONGODB_URI.split('@')[1] || 'Cluster');
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

const seedReturnRequest = async () => {
    await connectDB();
    try {
        const Order = mongoose.connection.collection('orders');
        const OrderItem = mongoose.connection.collection('orderitems');
        const Return = mongoose.connection.collection('returns');
        const Customer = mongoose.connection.collection('customers');
        const Seller = mongoose.connection.collection('sellers');
        const Product = mongoose.connection.collection('products');

        console.log('--- STARTING RETURN SEEDING ---');

        // 1. Try to find an existing order and its order items
        let order = await Order.findOne({});
        let orderItem = null;
        let customerId = null;
        let sellerId = null;

        if (order) {
            console.log(`Found existing Order: ${order.orderNumber || order._id}`);
            customerId = order.customer;
            // Find order item
            orderItem = await OrderItem.findOne({ order: order._id });
            if (orderItem) {
                console.log(`Found existing OrderItem: ${orderItem.productName} for Seller: ${orderItem.seller}`);
                sellerId = orderItem.seller;
            }
        }

        // 2. If no order or order items exist, let's create a robust dummy tree
        if (!order || !orderItem) {
            console.log('No suitable order or order items found. Creating dummy data tree...');

            // Find or create seller
            let seller = await Seller.findOne({});
            if (!seller) {
                const sellerIdObj = new mongoose.Types.ObjectId();
                await Seller.insertOne({
                    _id: sellerIdObj,
                    sellerName: 'Vrushahi Premium Seller',
                    storeName: 'Vrushahi Grocery Hub',
                    email: 'seller@vrushahi.com',
                    mobile: '9876543211',
                    status: 'Active',
                    createdAt: new Date()
                });
                seller = await Seller.findOne({ _id: sellerIdObj });
                console.log('Created dummy Seller');
            }
            sellerId = seller._id;

            // Find or create customer
            let customer = await Customer.findOne({});
            if (!customer) {
                const customerIdObj = new mongoose.Types.ObjectId();
                await Customer.insertOne({
                    _id: customerIdObj,
                    name: 'Rahul Sharma',
                    email: 'rahul.sharma@gmail.com',
                    mobile: '9999988888',
                    status: 'Active',
                    createdAt: new Date()
                });
                customer = await Customer.findOne({ _id: customerIdObj });
                console.log('Created dummy Customer');
            }
            customerId = customer._id;

            // Find or create product
            let product = await Product.findOne({ seller: sellerId });
            if (!product) {
                const productIdObj = new mongoose.Types.ObjectId();
                await Product.insertOne({
                    _id: productIdObj,
                    productName: 'Organic Premium Basmati Rice',
                    description: 'Long-grain fragrant rice perfect for daily meals.',
                    price: 150,
                    discPrice: 130,
                    seller: sellerId,
                    mainImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
                    stock: 50,
                    status: 'Active',
                    createdAt: new Date()
                });
                product = await Product.findOne({ _id: productIdObj });
                console.log('Created dummy Product');
            }

            // Create Order
            const orderIdObj = new mongoose.Types.ObjectId();
            const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            await Order.insertOne({
                _id: orderIdObj,
                orderNumber: orderNumber,
                customer: customerId,
                customerName: customer.name || 'Rahul Sharma',
                customerEmail: customer.email || 'rahul.sharma@gmail.com',
                customerPhone: customer.mobile || '9999988888',
                status: 'Delivered',
                paymentMethod: 'COD',
                paymentStatus: 'Paid',
                total: 260,
                deliveryAddress: {
                    address: '102, Shanti Vihar, Near Metro Station',
                    city: 'Delhi',
                    pincode: '110001'
                },
                orderDate: new Date(),
                createdAt: new Date()
            });
            order = await Order.findOne({ _id: orderIdObj });
            console.log('Created dummy Order:', orderNumber);

            // Create OrderItem
            const orderItemIdObj = new mongoose.Types.ObjectId();
            await OrderItem.insertOne({
                _id: orderItemIdObj,
                order: order._id,
                product: product._id,
                seller: sellerId,
                productName: product.productName,
                productImage: product.mainImage,
                sku: 'BASMATI-RICE-1KG',
                unitPrice: 130,
                quantity: 2,
                total: 260,
                variation: '1 Kg Pack',
                status: 'Delivered',
                createdAt: new Date()
            });
            orderItem = await OrderItem.findOne({ _id: orderItemIdObj });
            console.log('Created dummy OrderItem');
        }

        // Double-check customerId and sellerId are set properly
        if (!customerId) {
            const customer = await Customer.findOne({});
            customerId = customer ? customer._id : new mongoose.Types.ObjectId();
        }
        if (!sellerId) {
            const seller = await Seller.findOne({});
            sellerId = seller ? seller._id : new mongoose.Types.ObjectId();
        }

        // 3. Clear existing return requests to avoid clutter and have fresh ones
        await Return.deleteMany({});
        console.log('Cleared existing Return Requests');

        // 4. Insert dummy return requests
        const returnRequestsToInsert = [
            {
                order: order._id,
                orderItem: orderItem._id,
                customer: customerId,
                reason: 'Wrong item delivered',
                description: 'I ordered the 1 Kg Pack but received the 500g variant instead. Please refund or replace.',
                status: 'Pending',
                quantity: 1,
                images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400'],
                pickupAddress: order.deliveryAddress || {
                    address: '102, Shanti Vihar, Near Metro Station',
                    city: 'Delhi',
                    pincode: '110001'
                },
                refundAmount: orderItem.unitPrice || 130,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                order: order._id,
                orderItem: orderItem._id,
                customer: customerId,
                reason: 'Product damaged / defective',
                description: 'The packaging of the item was torn and the product contents had spilled inside the transit bag.',
                status: 'Approved',
                quantity: 1,
                images: [],
                pickupAddress: order.deliveryAddress || {
                    address: '102, Shanti Vihar, Near Metro Station',
                    city: 'Delhi',
                    pincode: '110001'
                },
                refundAmount: orderItem.unitPrice || 130,
                pickupScheduled: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            }
        ];

        await Return.insertMany(returnRequestsToInsert);
        console.log('Seeded 2 Return Requests successfully (1 Pending, 1 Approved)!');

        // Let's verify the inserted data
        const returnCount = await Return.countDocuments({});
        console.log(`Total return requests in database: ${returnCount}`);

        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected');
    }
};

seedReturnRequest();
