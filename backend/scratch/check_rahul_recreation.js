const mongoose = require('mongoose');
const Delivery = require('../dist/models/Delivery').default;

const mongoUri = 'mongodb+srv://vinijinodiya:Vini%40123@cluster0.qsz1vc3.mongodb.net/SpeeUp?appName=Cluster0';

async function checkRecentProfiles() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const now = new Date();
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        console.log('Searching for profiles created after:', yesterday.toISOString());
        
        const recentProfiles = await Delivery.find({ 
            createdAt: { $gte: yesterday }
        });

        console.log(`Found ${recentProfiles.length} recent delivery profiles.`);
        console.log(JSON.stringify(recentProfiles, null, 2));

        // Also check for any 'Rahul' accounts regardless of date
        const allRahuls = await Delivery.find({ name: /Rahul/i });
        console.log(`\nFound ${allRahuls.length} total Rahul profiles.`);
        allRahuls.forEach(r => {
            console.log(`- ID: ${r._id}, Name: ${r.name}, Mobile: ${r.mobile}, CreatedAt: ${r.createdAt.toISOString()}, Status: ${r.status}, Online: ${r.isOnline}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkRecentProfiles();
