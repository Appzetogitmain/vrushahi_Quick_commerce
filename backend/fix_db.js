const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0').then(async () => {
    const db = mongoose.connection.db;
    await db.collection('deliveries').updateMany({ isOnline: true }, { $set: { available: 'Available' } });
    console.log('Updated DB');
    process.exit(0);
});
