const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0').then(() => {
  const db = mongoose.connection.db;
  db.collection('products').find({productName: {$regex: /Face Cream|Body wash|Lemon|Coffee|ATTA/i}}).toArray().then(docs => {
    console.log(JSON.stringify(docs.map(d => ({name: d.productName, variations: d.variations, netQuantity: d.netQuantity, pack: d.pack})), null, 2));
    process.exit(0);
  });
});
