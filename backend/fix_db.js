const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please add it to your backend/.env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    await db.collection('deliveries').updateMany({ isOnline: true }, { $set: { available: 'Available' } });
    console.log('Updated DB');
    process.exit(0);
});
