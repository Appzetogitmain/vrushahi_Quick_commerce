import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "./src/models/Category";
import SubCategory from "./src/models/SubCategory";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // Update Category collection
    const categoryResult = await Category.updateMany(
      {},
      { $unset: { commissionRate: "" } }
    );
    console.log(`Updated ${categoryResult.modifiedCount} Categories (set commissionRate to null/unset)`);

    // Update SubCategory collection
    const subCategoryResult = await SubCategory.updateMany(
      {},
      { $unset: { commissionRate: "" } }
    );
    console.log(`Updated ${subCategoryResult.modifiedCount} SubCategories (set commissionRate to null/unset)`);

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
