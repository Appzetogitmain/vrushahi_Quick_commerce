import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    parentId: mongoose.Schema.Types.ObjectId,
    status: String
});

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

async function checkCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to DB');

        const categories = await Category.find({ parentId: null });
        console.log('Root Categories:');
        categories.forEach(c => console.log(`- ${c.name} (slug: ${c.slug}, id: ${c._id})`));

        const personalCare = await Category.findOne({ slug: 'personal-care' });
        console.log('\nPersonal Care Category:', personalCare);

        if (personalCare) {
            const subs = await Category.find({ parentId: personalCare._id });
            console.log(`\nSubcategories of ${personalCare.name}:`, subs.length);
            subs.forEach(s => console.log(`  - ${s.name} (slug: ${s.slug}, id: ${s._id})`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkCategories();
