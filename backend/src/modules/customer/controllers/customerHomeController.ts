import { Request, Response } from "express";
import Product from "../../../models/Product";
import Seller from "../../../models/Seller";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import HeaderCategory from "../../../models/HeaderCategory";
import HomeSection from "../../../models/HomeSection";
import BestsellerCard from "../../../models/BestsellerCard";
import LowestPricesProduct from "../../../models/LowestPricesProduct";
import PromoStrip from "../../../models/PromoStrip";
import Banner from "../../../models/Banner";
import mongoose from "mongoose";
import { cache } from "../../../utils/cache";
import { findSellersWithinRange } from "../../../utils/locationHelper";

// Helper function to fetch data for a home section based on its configuration
async function fetchSectionData(
  section: any,
  nearbySellerIds?: mongoose.Types.ObjectId[],
): Promise<any[]> {
  try {
    const { categories, subCategories, displayType, limit } = section;

    // If displayType is "subcategories", fetch subcategories
    if (displayType === "subcategories") {
      const categoryIds = (categories || [])
        .map((cat: any) => (cat ? cat._id || cat : null))
        .filter((id: any) => id);
      const subCategoryIds = (subCategories || [])
        .map((sub: any) => (sub ? sub._id || sub : null))
        .filter((id: any) => id);

      console.log(`[fetchSectionData] Fetching subcategories for section "${section.title}"`, {
        categoryIds,
        subCategoryIds
      });

      // Query Category model instead of SubCategory, as subcategories were migrated to Category
      const query: any = { status: "Active" };

      if (categoryIds.length > 0 && subCategoryIds.length > 0) {
        query.$or = [{ parentId: { $in: categoryIds } }, { _id: { $in: subCategoryIds } }];
      } else if (categoryIds.length > 0) {
        query.parentId = { $in: categoryIds };
      } else if (subCategoryIds.length > 0) {
        query._id = { $in: subCategoryIds };
      } else {
        return [];
      }

      const subcategoryDocs = await Category.find(query)
        .select("name image order slug parentId")
        .sort({ order: 1 })
        .limit(limit || 12)
        .lean();

      console.log(`[fetchSectionData] Found ${subcategoryDocs.length} subcategories in Category model`);

      if (subcategoryDocs.length > 0) {
        return subcategoryDocs.map((sub: any) => ({
          id: sub._id.toString(),
          subcategoryId: sub._id.toString(),
          categoryId: sub.parentId?.toString() || "",
          name: sub.name,
          image: sub.image || "",
          slug: sub.slug || sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          type: "subcategory",
        }));
      }

      // Fallback: Try fetching from SubCategory model (legacy)
      const legacySubcategories = await SubCategory.find({
        category: { $in: categoryIds },
      })
        .select("name image order category")
        .sort({ order: 1 })
        .limit(limit || 10)
        .lean();

      return legacySubcategories.map((sub: any) => ({
        id: sub._id.toString(),
        subcategoryId: sub._id.toString(),
        categoryId: sub.category?.toString() || "",
        name: sub.name,
        image: sub.image || "",
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type: "subcategory",
      }));
    }

    // If displayType is "products", fetch products
    if (displayType === "products") {
      const query: any = {
        status: "Active",
        publish: true,
        // Exclude shop-by-store-only products from home sections
        $or: [
          { isShopByStoreOnly: { $ne: true } },
          { isShopByStoreOnly: { $exists: false } },
        ],
      };

      // We fetch these irrespective of location radius to show preview images on home page
      // Location validation still happens at cart/order level
      if (nearbySellerIds && nearbySellerIds.length > 0) {
        // If we have nearby sellers, we can still filter by them if we want to prioritize
        // But the user requested to show them irrespective of location radius
        // For now, let's keep it simple and show all active products for the section
      }

      if (categories && categories.length > 0) {
        const categoryIds = categories
          .map((cat: any) => (cat ? cat._id || cat : null))
          .filter((id: any) => id);

        if (categoryIds.length > 0) {
          query.category = { $in: categoryIds };
        }
      }

      if (subCategories && subCategories.length > 0) {
        const subCategoryIds = subCategories
          .map((sub: any) => (sub ? sub._id || sub : null))
          .filter((id: any) => id);

        if (subCategoryIds.length > 0) {
          query.subcategory = { $in: subCategoryIds };
        }
      }

      const products = await Product.find(query)
        .sort({ createdAt: -1 }) // Show newest items first
        .limit(limit || 8)
        .select(
          "productName mainImage variations price mrp discount rating reviewsCount pack seller",
        )
        .lean();

      return products.map((p: any) => {
        // Check if the product's seller is within range.
        // If no location provided (nearbySellerIds is empty), all products are available by default.
        const isAvailable =
          nearbySellerIds && nearbySellerIds.length > 0 && p.seller
            ? nearbySellerIds.some(
              (id) => id.toString() === p.seller.toString(),
            )
            : true; // Default to available when no location is provided

        const fallbackImage = p.mainImage || p.variations?.find((v: any) => !!v.image)?.image || "";

        return {
          id: p._id.toString(),
          productId: p._id.toString(),
          name: p.productName,
          productName: p.productName,
          image: fallbackImage,
          mainImage: fallbackImage,
          price: p.price,
          discount:
            p.discount ||
            (p.mrp && p.price
              ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
              : 0),
          productImages: p.mainImage ? [p.mainImage] : [],
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          reviews: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
        };
      });
    }

    // If displayType is "categories", fetch the selected categories themselves
    if (displayType === "categories") {
      // If categories are specified, fetch those specific categories
      if (categories && categories.length > 0) {
        const categoryIds = categories.map((cat: any) => cat._id || cat);

        const fetchedCategories = await Category.find({
          _id: { $in: categoryIds },
          status: "Active",
        })
          .select("name image slug")
          .sort({ order: 1 })
          .limit(limit || 8)
          .lean();

        return fetchedCategories.map((c: any) => ({
          id: c._id.toString(),
          categoryId: c.slug || c._id.toString(), // Use slug for SEO-friendly URLs, fallback to _id
          name: c.name,
          image: c.image,
          slug: c.slug,
          type: "category",
        }));
      } else {
        // If no categories specified, return empty array
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching section data:", error);
    return [];
  }
}

// Get Home Page Content
export const getHomeContent = async (req: Request, res: Response) => {
  const { headerCategorySlug, latitude, longitude } = req.query; // Get header category slug and location from query params

  try {
    // Find sellers within user's location range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    } else {
      // If no location provided, return empty sellers list to enforce filtering
      nearbySellerIds = [];
    }

    // 1. Featured / Bestsellers - Get bestseller cards from admin configuration
    const bestsellerCards = await BestsellerCard.find({
      isActive: true,
    })
      .populate("category", "name slug image")
      .sort({ order: 1 })
      .limit(6)
      .lean();

    // For each bestseller card, get 4 products from the associated category
    const bestsellers = await Promise.all(
      bestsellerCards.map(async (card: any) => {
        const categoryId = card.category?._id || card.category;

        // Build product query for images (ignore location to show category preview)
        const productQuery: any = {
          category: categoryId,
          status: "Active",
          publish: true,
        };

        // Fetch 4 active products from the category for preview images
        // We fetch these irrespective of location radius to show category preview
        const categoryProducts = await Product.find(productQuery)
          .select("productName mainImage variations galleryImages")
          .sort({ createdAt: -1 })
          .limit(4)
          .lean();

        // Extract exactly 4 product images (prefer mainImage, fallback to galleryImages[0])
        const productImages: string[] = [];
        categoryProducts.forEach((product: any) => {
          const img = product.mainImage || product.variations?.find((v: any) => !!v.image)?.image;
          if (productImages.length < 4 && img) {
            productImages.push(img);
          }
        });

        // If we have less than 4 products, try to use gallery images
        if (productImages.length < 4) {
          categoryProducts.forEach((product: any) => {
            if (
              productImages.length < 4 &&
              product.galleryImages &&
              product.galleryImages.length > 0
            ) {
              productImages.push(product.galleryImages[0]);
            }
          });
        }

        // Ensure we have exactly 4 images (pad with first image if needed)
        while (productImages.length < 4 && productImages[0]) {
          productImages.push(productImages[0]);
        }

        return {
          id: card._id.toString(),
          categoryId: categoryId.toString(),
          name: card.name,
          productImages: productImages.slice(0, 4),
          productCount: categoryProducts.length,
        };
      }),
    );

    // 2. Lowest Prices Products - Get admin-selected products
    // We fetch these irrespective of location radius to show preview on home page
    const lowestPricesProductsQuery: any = {
      isActive: true,
    };

    const lowestPricesProducts = await LowestPricesProduct.find(
      lowestPricesProductsQuery,
    )
      .populate({
        path: "product",
        select:
          "productName mainImage variations price mrp discount status publish category subcategory seller",
        match: {
          status: "Active",
          publish: true,
          // Removed location filter to show preview images irrespective of radius
        },
      })
      .sort({ order: 1 })
      .lean();

    // Filter out any products that were null (due to match condition)
    const validLowestPricesProducts = lowestPricesProducts
      .filter((item: any) => item.product !== null)
      .map((item: any) => {
        const product = item.product;
        // Check if the product's seller is within range
        // Check if the product's seller is within range.
        // If no location provided (nearbySellerIds is empty), all products are available.
        const isAvailable =
          nearbySellerIds && nearbySellerIds.length > 0 && product.seller
            ? nearbySellerIds.some(
              (id) => id.toString() === product.seller.toString(),
            )
            : true; // Default available when no location sent

        const fallbackImage = product.mainImage || product.variations?.find((v: any) => !!v.image)?.image || "";

        return {
          id: product._id.toString(),
          _id: product._id.toString(),
          productName: product.productName,
          name: product.productName,
          mainImage: fallbackImage,
          imageUrl: fallbackImage,
          price: product.price,
          mrp: product.mrp || product.price,
          discount:
            product.discount ||
            (product.mrp && product.price
              ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
              : 0),
          categoryId: product.category?.toString() || "",
          subcategory: product.subcategory?.toString() || "",
          status: product.status,
          publish: product.publish,
          isAvailable,
          seller: product.seller,
        };
      });

    // 3. Categories for Tiles (Grocery, Snacks, etc)
    const categories = await Category.find({
      status: "Active",
    })
      .select("name image icon color slug")
      .sort({ order: 1 });

    // 4.1 Nearby Stores (Real Sellers) - Swiggy/Zomato style
    let nearbyStores: any[] = [];
    if (userLat !== null && userLng !== null) {
      // Find all approved sellers with location
      const allApprovedSellers = await Seller.find({
        status: "Approved",
      }).select("storeName logo storeBanner address location serviceRadiusKm isShopOpen rating reviewsCount latitude longitude city categories workingHours").lean();

      nearbyStores = allApprovedSellers.map((seller: any) => {
        let sellerLat: number | null = null;
        let sellerLng: number | null = null;

        if (seller.location?.coordinates?.length === 2) {
          sellerLng = seller.location.coordinates[0];
          sellerLat = seller.location.coordinates[1];
        } else if (seller.latitude && seller.longitude) {
          sellerLat = parseFloat(seller.latitude);
          sellerLng = parseFloat(seller.longitude);
        }

        let distance = null;
        if (sellerLat !== null && sellerLng !== null && !isNaN(sellerLat) && !isNaN(sellerLng)) {
          // Calculate distance using existing utility logic (simplified here)
          const R = 6371;
          const dLat = ((sellerLat - userLat) * Math.PI) / 180;
          const dLon = ((sellerLng - userLng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) * Math.cos((sellerLat * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = parseFloat((R * c).toFixed(1));
        }

        const isNearby = distance !== null && distance <= (seller.serviceRadiusKm || 10);
        
        // Category filtering logic
        let matchesCategory = true;
        if (headerCategorySlug && headerCategorySlug !== "all") {
          const slug = (headerCategorySlug as string).toLowerCase();
          matchesCategory = seller.categories && seller.categories.some(
            (c: string) => c.toLowerCase() === slug || c.toLowerCase().includes(slug)
          );
        }

        return {
          id: seller._id.toString(),
          name: seller.storeName,
          logo: seller.logo,
          banner: seller.storeBanner || "",
          address: seller.address || "",
          rating: seller.rating || 0,
          reviewsCount: seller.reviewsCount || 0,
          isShopOpen: seller.isShopOpen !== false,
          distance: distance,
          isNearby: isNearby && matchesCategory,
          deliveryTime: "24 mins",
          city: seller.city,
          categories: seller.categories,
          workingHours: seller.workingHours
        };
      }).filter((s: any) => s.isNearby); // Only show stores that can actually deliver to the user and match category if filtered

      nearbyStores.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    // 5. Trending Items (Fetch some popular categories or products)
    const trendingCategories = await Category.find({
      status: "Active",
    })
      .limit(5)
      .select("name image slug");

    const trending = trendingCategories.map((c) => ({
      id: c._id,
      name: c.name,
      image: c.image || `/assets/categories/${c.slug}.jpg`,
      type: "category",
    }));

    // 6. Personal Care Subcategories - Now handled by dynamic sections

    // 7. Cooking Ideas (Fetch some products from 'Food' or 'Grocery' categories)
    // We fetch these irrespective of location radius to show preview images
    const foodProductsQuery: any = {
      status: "Active",
      publish: true,
    };

    const foodProducts = await Product.find(foodProductsQuery)
      .limit(3)
      .select("productName mainImage");

    const cookingIdeas = foodProducts.map((p) => ({
      id: p._id,
      title: p.productName,
      image: p.mainImage,
      productId: p._id,
    }));

    // 8. Promo Cards (Dynamic - Categories with headerCategoryId)
    // Fetch root categories (parentId: null) that have a headerCategoryId assigned and are Active
    // If headerCategorySlug is provided, filter by that specific header category
    // Include their child categories (subcategories) with images

    // Build query for categories
    const categoryQuery: any = {
      headerCategoryId: { $exists: true, $ne: null },
      status: "Active",
      parentId: null, // Only root categories (not subcategories themselves)
    };

    // If headerCategorySlug is provided, find the header category and filter by it
    if (headerCategorySlug && headerCategorySlug !== "all") {
      const headerCategory = await HeaderCategory.findOne({
        slug: headerCategorySlug,
        status: "Published",
      }).lean();

      if (headerCategory) {
        categoryQuery.headerCategoryId = headerCategory._id;
      } else {
        // If header category not found, return empty promo cards for this header category
        // The query will still work but won't match any categories
        console.log(
          `Header category with slug "${headerCategorySlug}" not found`,
        );
      }
    }

    const categoriesWithHeaderCategory = await Category.find(categoryQuery)
      .populate("headerCategoryId", "name status")
      .sort({ order: 1 })
      .limit(4) // Limit to 4 promo cards
      .lean();

    const promoCards = await Promise.all(
      categoriesWithHeaderCategory.map(async (category: any) => {
        // Get child categories (subcategories) for this category
        const childCategories = await Category.find({
          parentId: category._id,
          status: "Active",
        })
          .select("name image _id")
          .sort({ order: 1 })
          .limit(4) // Limit to 4 subcategory images
          .lean();

        // Extract subcategory images
        const subcategoryImages = childCategories
          .map((child: any) => child.image)
          .filter((img: string) => img && img.trim() !== "");

        return {
          id: category._id.toString(),
          badge: "Up to 55% OFF", // Default badge, can be customized later
          title: category.name,
          categoryId: category._id.toString(),
          slug: category.slug || category._id.toString(),
          bgColor: "bg-yellow-50",
          subcategoryImages: subcategoryImages.slice(0, 4), // Max 4 images
        };
      }),
    );

    // Fallback to hardcoded cards if no categories with headerCategoryId exist
    const finalPromoCards =
      promoCards.length > 0
        ? promoCards
        : [
          {
            id: "self-care",
            badge: "Up to 55% OFF",
            title: "Self Care & Wellness",
            categoryId: "personal-care",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "hot-meals",
            badge: "Up to 55% OFF",
            title: "Hot Meals & Drinks",
            categoryId: "breakfast-instant",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "kitchen-essentials",
            badge: "Up to 55% OFF",
            title: "Kitchen Essentials",
            categoryId: "atta-rice",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "cleaning-home",
            badge: "Up to 75% OFF",
            title: "Cleaning & Home Needs",
            categoryId: "household",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
        ];

    // 9. Dynamic Home Sections - Fetch from database
    // Filter by pageLocation: "home" if we are on the main home page
    const homeSectionQuery: any = { isActive: true };

    if (headerCategorySlug && headerCategorySlug !== "all") {
      // If we are on a header category page, find the header category ID
      const headerCategory = await HeaderCategory.findOne({
        slug: headerCategorySlug,
        status: "Published",
      }).lean();

      if (headerCategory) {
        homeSectionQuery.pageLocation = "header_category";
        homeSectionQuery.headerCategoryId = headerCategory._id;
      } else {
        // Fallback to home page sections if header category not found
        homeSectionQuery.pageLocation = "home";
      }
    } else {
      homeSectionQuery.pageLocation = "home";
    }

    const homeSections = await HomeSection.find(homeSectionQuery)
      .populate("categories", "name slug image")
      .populate("subCategories", "name")
      .populate("headerCategoryId", "name")
      .sort({ order: 1 })
      .lean();

    // Fetch data for each section
    const dynamicSections = await Promise.all(
      homeSections.map(async (section: any) => {
        const sectionData = await fetchSectionData(section, nearbySellerIds);
        return {
          id: section._id.toString(),
          title: section.title,
          slug: section.slug,
          displayType: section.displayType,
          columns: section.columns,
          backgroundImage: section.backgroundImage,
          backgroundColor: section.backgroundColor,
          titleColor: section.titleColor,
          data: sectionData,
        };
      }),
    );

    // 10. Fetch PromoStrip for the current header category (with caching)
    const currentHeaderCategorySlug = (headerCategorySlug as string) || "all";
    const promoStripCacheKey = `promoStrip-${currentHeaderCategorySlug.toLowerCase()}`;

    // Try to get from cache first
    let promoStrip = cache.get(promoStripCacheKey) as any;

    if (!promoStrip) {
      const now = new Date();
      const promoStripDoc = await PromoStrip.findOne({
        headerCategorySlug: currentHeaderCategorySlug.toLowerCase(),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .populate("categoryCards.categoryId", "name slug image")
        .populate(
          "featuredProducts",
          "productName mainImage mainImageUrl variations galleryImageUrls galleryImages price mrp compareAtPrice discount rating reviewsCount seller",
        )
        .sort({ order: 1 })
        .lean();

      promoStrip = promoStripDoc;

      // If we have promoStrip, add availability flag to featured products
      if (promoStrip && (promoStrip as any).featuredProducts) {
        (promoStrip as any).featuredProducts = (
          promoStrip as any
        ).featuredProducts.map((p: any) => {
          const isAvailable =
            nearbySellerIds && nearbySellerIds.length > 0 && p.seller
              ? nearbySellerIds.some(
                (id) => id.toString() === p.seller.toString(),
              )
              : true; // Default available when no location
          const fallbackImage = p.mainImage || p.variations?.find((v: any) => !!v.image)?.image || "";
          return { ...p, isAvailable, mainImage: fallbackImage };
        });
      }

      // Cache for 3 minutes (PromoStrip data doesn't change frequently)
      if (promoStrip) {
        cache.set(promoStripCacheKey, promoStrip, 3 * 60 * 1000);
      } else {
        // Cache null result for 1 minute to prevent repeated DB queries
        cache.set(promoStripCacheKey, null, 60 * 1000);
      }
    }

    // Fetch banners from database
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        bestsellers,
        lowestPrices: validLowestPricesProducts, // Admin-selected products for LowestPricesEver section
        categories,
        // Dynamic sections created by admin
        homeSections: dynamicSections,
        nearbyStores,
        promoBanners:
          banners.length > 0
            ? banners
            : [
              {
                id: 1,
                image:
                  "https://img.freepik.com/free-vector/horizontal-banner-template-grocery-sales_23-2149432421.jpg",
                link: "/category/grocery",
              },
              {
                id: 2,
                image:
                  "https://img.freepik.com/free-vector/flat-supermarket-social-media-cover-template_23-2149363385.jpg",
                link: "/category/snacks",
              },
            ],
        trending,
        cookingIdeas,
        promoCards: finalPromoCards, // Return dynamic or fallback cards
        promoStrip: promoStrip || null, // PromoStrip data for the current header category
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching home content",
      error: error.message,
    });
  }
};

// Check if user's location is within any seller's service radius
export const checkServiceArea = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    if (
      userLat == null ||
      userLng == null ||
      isNaN(userLat) ||
      isNaN(userLng) ||
      userLat < -90 ||
      userLat > 90 ||
      userLng < -180 ||
      userLng > 180
    ) {
      return res.status(200).json({
        success: true,
        hasSellersInRange: false,
      });
    }

    const nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    return res.status(200).json({
      success: true,
      hasSellersInRange: nearbySellerIds.length > 0,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error checking service area",
      error: error.message,
    });
  }
};

// Get Global Search results (Products and Stores)
export const getGlobalSearch = async (req: Request, res: Response) => {
  try {
    const { q, latitude, longitude } = req.query;
    const query = q as string;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { products: [], stores: [] }
      });
    }

    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    }

    // 1. Search Products using text search or regex
    // Using regex for better prefix matching in quick commerce
    const productSearchQuery: any = {
      status: "Active",
      publish: true,
      $or: [
        { productName: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } }
      ]
    };

    const products = await Product.find(productSearchQuery)
      .limit(20)
      .populate("category", "name")
      .populate("seller", "storeName location")
      .lean();

    const formattedProducts = products.map((p: any) => {
      const isAvailable = (!userLat || !userLng) || (p.seller && nearbySellerIds.some(id => id.toString() === p.seller._id.toString()));
      return {
        ...p,
        id: p._id.toString(),
        isAvailable
      };
    });

    // 2. Search Stores (Sellers)
    const storeSearchQuery: any = {
      status: "Approved",
      storeName: { $regex: query, $options: "i" }
    };

    const stores = await Seller.find(storeSearchQuery)
      .limit(10)
      .lean();

    const formattedStores = stores.map((seller: any) => {
      let sellerLat: number | null = null;
      let sellerLng: number | null = null;

      if (seller.location?.coordinates?.length === 2) {
        sellerLng = seller.location.coordinates[0];
        sellerLat = seller.location.coordinates[1];
      } else if (seller.latitude && seller.longitude) {
        sellerLat = parseFloat(seller.latitude);
        sellerLng = parseFloat(seller.longitude);
      }

      let distance = null;
      if (userLat !== null && userLng !== null && sellerLat !== null && sellerLng !== null && !isNaN(sellerLat) && !isNaN(sellerLng)) {
        const R = 6371;
        const dLat = ((sellerLat - userLat) * Math.PI) / 180;
        const dLon = ((sellerLng - userLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLat * Math.PI) / 180) * Math.cos((sellerLat * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = parseFloat((R * c).toFixed(1));
      }

      const isNearby = distance !== null && distance <= (seller.serviceRadiusKm || 10);

      return {
        id: seller._id.toString(),
        name: seller.storeName,
        logo: seller.logo,
        banner: seller.storeBanner || "",
        address: seller.address || "",
        rating: seller.rating || 0,
        reviewsCount: seller.reviewsCount || 0,
        isShopOpen: seller.isShopOpen !== false,
        distance: distance,
        isNearby: isNearby,
        deliveryTime: "24 mins",
        city: seller.city,
        categories: seller.categories,
        workingHours: seller.workingHours
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
        stores: formattedStores
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error in global search",
      error: error.message
    });
  }
};
