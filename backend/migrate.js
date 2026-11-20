const { MongoClient } = require('mongodb');

require('dotenv').config();
const sourceUri = process.env.MIGRATE_SOURCE_URI;
const targetUri = process.env.MIGRATE_TARGET_URI || process.env.MONGODB_URI;

async function migrate() {
    const sourceClient = new MongoClient(sourceUri);
    const targetClient = new MongoClient(targetUri);

    try {
        await sourceClient.connect();
        await targetClient.connect();
        console.log("Connected to both databases.");

        const sourceDb = sourceClient.db();
        const targetDb = targetClient.db();

        const collections = await sourceDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            // Skip system collections
            if (colName.startsWith('system.')) continue;
            
            console.log(`\nMigrating collection: ${colName}...`);
            
            const sourceCol = sourceDb.collection(colName);
            const targetCol = targetDb.collection(colName);
            
            try {
                await targetCol.drop();
                console.log(`Dropped existing target collection: ${colName} (to avoid duplicates)`);
            } catch(e) {
                // Ignore error if collection doesn't exist
            }
            
            const cursor = sourceCol.find({});
            let batch = [];
            let count = 0;
            let total = 0;
            
            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                batch.push(doc);
                count++;
                
                if (count >= 500) {
                    await targetCol.insertMany(batch);
                    total += batch.length;
                    console.log(`Inserted ${total} documents into ${colName}...`);
                    batch = [];
                    count = 0;
                }
            }
            
            if (batch.length > 0) {
                await targetCol.insertMany(batch);
                total += batch.length;
            }
            
            console.log(`Successfully migrated total ${total} documents for ${colName}.`);
        }
        
        console.log("\nMigration completed successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await sourceClient.close();
        await targetClient.close();
    }
}

migrate();
