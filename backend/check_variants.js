const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please add it to your backend/.env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(() => {
  const db = mongoose.connection.db;
  db.collection('products').find({productName: {$regex: /Face Cream|Body wash|Lemon|Coffee|ATTA/i}}).toArray().then(docs => {
    console.log(JSON.stringify(docs.map(d => ({name: d.productName, variations: d.variations, netQuantity: d.netQuantity, pack: d.pack})), null, 2));
    process.exit(0);
  });
});

