import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const AdminSchema = new mongoose.Schema({
    email: String,
    mobile: String,
    password: { type: String, select: true },
    role: String,
    status: String
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function checkAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to DB:', mongoose.connection.name);

        const admins = await Admin.find({});
        console.log('Total Admins:', admins.length);
        admins.forEach(a => {
            console.log(`- Email: ${a.email}, Mobile: ${a.mobile}, Role: ${a.role}, Status: ${a.status}`);
            console.log(`  Password Hash: ${a.password?.substring(0, 20)}...`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdmins();
