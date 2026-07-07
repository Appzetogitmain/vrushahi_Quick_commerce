import mongoose from "mongoose";
import dotenv from "dotenv";
import Seller from "./src/models/Seller";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // Unset commission field for all Commission-based sellers who have commission: 0
    // These sellers should fall through to the Global Default commission rate
    const result = await Seller.updateMany(
      {
        businessModel: "Commission",
        commission: 0,
      },
      {
        $unset: { commission: "" },
      }
    );

    console.log(
      `Updated ${result.modifiedCount} Commission-based sellers (unset commission: 0 → will now use Global Default)`
    );

    // Also report how many subscription sellers exist (just for info)
    const subscriptionCount = await Seller.countDocuments({
      businessModel: "Subscription",
      subscriptionStatus: "Active",
    });
    console.log(
      `Active Subscription sellers (they correctly get 0% commission): ${subscriptionCount}`
    );

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
