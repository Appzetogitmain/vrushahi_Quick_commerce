import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ProductSchema = new mongoose.Schema({
    name: String,
    status: String,
    publish: Boolean,
    category: mongoose.Schema.Types.ObjectId,
    subcategory: mongoose.Schema.Types.ObjectId
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to DB');

        const total = await Product.countDocuments();
        console.log('Total Products:', total);

        const active = await Product.find({ status: 'Active', publish: true }).limit(5);
        console.log('\nTop 5 Active/Published Products:');
        active.forEach(p => console.log(`- ${p.name} (id: ${p._id}, cat: ${p.category})`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkProducts();
