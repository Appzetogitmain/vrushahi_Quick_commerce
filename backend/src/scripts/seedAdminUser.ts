import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/Admin";

dotenv.config();

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB...");

    const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@vrushahi.com";
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";
    const mobile = process.env.DEFAULT_ADMIN_MOBILE || "9876543210";

    const normalizedEmail = email.trim().toLowerCase();

    // Check if admin exists by email OR mobile
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email: normalizedEmail }, { mobile }] 
    });

    if (existingAdmin) {
      console.log(`Admin found. Updating email and password...`);
      
      existingAdmin.email = normalizedEmail;
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log(`Admin updated. Email: ${normalizedEmail}`);
      
      // Update password if we want to ensure it works
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log("Admin password updated to match .env");
    } else {
      console.log("Creating new default admin...");
      await Admin.create({
        firstName: "Super",
        lastName: "Admin",
        mobile,
        email: normalizedEmail,
        password,
        role: "Super Admin",
      });
      console.log(`Admin created successfully with email: ${normalizedEmail}`);
    }

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
