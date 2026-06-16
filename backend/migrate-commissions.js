const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/quick_commerce";

async function migrateCommissions() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // Migrate Category
        const categoryResult = await db.collection('categories').updateMany(
            { commissionRate: 0 },
            { $unset: { commissionRate: "" } }
        );
        console.log(`Categories updated: ${categoryResult.modifiedCount} (commissionRate unset)`);

        // Migrate SubCategory
        const subCategoryResult = await db.collection('subcategories').updateMany(
            { commissionRate: 0 },
            { $unset: { commissionRate: "" } }
        );
        console.log(`SubCategories updated: ${subCategoryResult.modifiedCount} (commissionRate unset)`);

        // Migrate Seller
        const sellerResult = await db.collection('sellers').updateMany(
            { commission: 0 },
            { $unset: { commission: "" } }
        );
        console.log(`Sellers updated: ${sellerResult.modifiedCount} (commission unset)`);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrateCommissions();
