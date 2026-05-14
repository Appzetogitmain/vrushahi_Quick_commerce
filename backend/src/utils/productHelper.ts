import Category from "../models/Category";
import SubCategory from "../models/SubCategory";
import mongoose from "mongoose";

/**
 * Manually populates the subcategory field for an array of products or a single product
 * from either the SubCategory model or the Category model.
 * Handles both Mongoose document instances and lean plain objects.
 */
export const populateProductsSubcategory = async (products: any | any[]) => {
  if (!products) return products;

  const isArray = Array.isArray(products);
  const productList = isArray ? products : [products];

  // 1. Gather all unique subcategory IDs that are valid ObjectIds
  const subcategoryIds = new Set<string>();
  productList.forEach((product: any) => {
    // Check both standard field and unpopulated mongoose subcategory
    const subcat = product.subcategory;
    if (subcat) {
      const idStr = subcat._id ? subcat._id.toString() : subcat.toString();
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        subcategoryIds.add(idStr);
      }
    }
  });

  if (subcategoryIds.size === 0) {
    return products;
  }

  const idsArray = Array.from(subcategoryIds);

  // 2. Fetch from SubCategory model (using old model)
  const oldSubs = await SubCategory.find({ _id: { $in: idsArray } })
    .select("_id name")
    .lean();

  // 3. Fetch from Category model (using new model)
  const newSubs = await Category.find({ _id: { $in: idsArray } })
    .select("_id name")
    .lean();

  // 4. Create a map of ID -> Name
  const subcategoryMap = new Map<string, string>();
  oldSubs.forEach((s) => {
    subcategoryMap.set(s._id.toString(), s.name);
  });
  newSubs.forEach((s) => {
    subcategoryMap.set(s._id.toString(), s.name);
  });

  // 5. Populate products
  productList.forEach((product: any) => {
    const subcat = product.subcategory;
    if (subcat) {
      const subcatIdStr = subcat._id ? subcat._id.toString() : subcat.toString();
      if (subcategoryMap.has(subcatIdStr)) {
        const name = subcategoryMap.get(subcatIdStr);
        const populatedVal = {
          _id: new mongoose.Types.ObjectId(subcatIdStr),
          name: name,
          subcategoryName: name, // Supports frontend expecting subcategoryName
        };

        // If it's a mongoose document, use set or raw property depending on whether it's lean
        if (typeof product.set === "function") {
          product.set("subcategory", populatedVal, { strict: false });
        } else {
          product.subcategory = populatedVal;
        }
      }
    }
  });

  return isArray ? productList : productList[0];
};
