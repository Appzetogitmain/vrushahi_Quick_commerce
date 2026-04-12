const mongoose = require('mongoose');

async function migrate() {
    try {
        await mongoose.connect('mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0');
        
        const HeaderCategorySchema = new mongoose.Schema({
            name: String,
            slug: String,
            theme: String
        });
        
        const HeaderCategory = mongoose.model('HeaderCategory', HeaderCategorySchema);
        
        const cats = await HeaderCategory.find({});
        console.log('Found', cats.length, 'categories');
        
        const generateSlug = (name) => {
            return name
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };
        
        for (const cat of cats) {
            const newTheme = cat.theme || cat.slug;
            const newSlug = generateSlug(cat.name);
            console.log(`Updating ${cat.name}: slug ${cat.slug} -> ${newSlug}, theme -> ${newTheme}`);
            
            await HeaderCategory.updateOne(
                { _id: cat._id },
                { $set: { theme: newTheme, slug: newSlug } }
            );
        }
        
        console.log('Migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
