import { Request, Response } from "express";
import Seller from "../../../models/Seller";
import Product from "../../../models/Product";
import mongoose from "mongoose";

// Get seller details and their products
export const getSellerStoreDetails = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const { sort, categories: categoryFilters, brands: brandFilters } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Store ID",
      });
    }

    // Fetch seller info
    const seller = await Seller.findById(sellerId).select(
      "storeName logo storeBanner storeDescription city isShopOpen rating reviewsCount location serviceRadiusKm address"
    ).lean();

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // Build filter query
    const filterQuery: any = {
      seller: sellerId,
      status: "Active",
      publish: true,
    };

    if (categoryFilters) {
       const cats = Array.isArray(categoryFilters) ? categoryFilters : [categoryFilters];
       filterQuery.category = { $in: cats };
    }

    if (brandFilters) {
       const brands = Array.isArray(brandFilters) ? brandFilters : [brandFilters];
       filterQuery.brand = { $in: brands };
    }

    // Sort options
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'price_low') sortOptions = { price: 1 };
    else if (sort === 'price_high') sortOptions = { price: -1 };
    else if (sort === 'rating') sortOptions = { rating: -1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };

    // Fetch products belonging to this seller
    const products = await Product.find(filterQuery)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .sort(sortOptions)
      .lean();

    // Group products by category for a better "Menu" experience
    const categoriesMap: { [key: string]: any } = {};
    
    products.forEach((p: any) => {
      const categoryName = p.category?.name || "General";
      const categoryId = p.category?._id?.toString() || "general";
      
      if (!categoriesMap[categoryId]) {
        categoriesMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          products: [],
        };
      }
      categoriesMap[categoryId].products.push({
          ...p,
          id: p._id.toString(),
          isAvailable: true // Since we are in the store, we assume they are available if active
      });
    });

    const groupedProducts = Object.values(categoriesMap);

    return res.status(200).json({
      success: true,
      data: {
        seller: {
          ...seller,
          id: seller._id.toString(),
          deliveryTime: "24 mins",
        },
        categories: groupedProducts,
        allProducts: products.map(p => ({ ...p, id: p._id.toString() }))
      },
    });
  } catch (error: any) {
    console.error("Error fetching seller store details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching store details",
      error: error.message,
    });
  }
};
