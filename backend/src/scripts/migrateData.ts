import { MongoClient } from 'mongodb';

const SOURCE_URI = 'mongodb+srv://kosilecommerce_db_user:973Chc5YHtBa3F1i@kosil.fcettwg.mongodb.net/SpeeUp';
const DEST_URI = 'mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/';
const DEST_DB_NAME = 'SpeeUp'; // You can change this if needed

async function migrate() {
    console.log('🚀 Starting MongoDB Migration...');
    
    const sourceClient = new MongoClient(SOURCE_URI);
    const destClient = new MongoClient(DEST_URI);

    try {
        await sourceClient.connect();
        await destClient.connect();
        console.log('✅ Connected to both databases');

        const sourceDb = sourceClient.db(); // Uses database from SOURCE_URI (SpeeUp)
        const destDb = destClient.db(DEST_DB_NAME);

        const collections = await sourceDb.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections to migrate`);

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`\n⏳ Migrating collection: ${collectionName}...`);

            const sourceCollection = sourceDb.collection(collectionName);
            const destCollection = destDb.collection(collectionName);

            // Fetch all documents
            const documents = await sourceCollection.find({}).toArray();
            
            if (documents.length === 0) {
                console.log(`  ⚪ Collection is empty, skipping.`);
                continue;
            }

            // Clear destination collection (optional, but safer for a clean copy)
            // await destCollection.deleteMany({});

            // Insert documents into destination
            const result = await destCollection.insertMany(documents);
            console.log(`  ✅ Successfully migrated ${result.insertedCount} documents.`);
        }

        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await sourceClient.close();
        await destClient.close();
    }
}

migrate();
