import { Request, Response } from "express";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Product from "../../../models/Product";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Get all categories (parent categories only by default)
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { includeSubcategories, search } = req.query;

    // Build query - by default, get only parent categories (no parentId)
    const query: any = { parentId: null };

    // If includeSubcategories is true, get all categories
    if (includeSubcategories === "true") {
      delete query.parentId;
    }

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(query)
      .populate("headerCategoryId", "name slug")
      .sort({ name: 1 });

    // Get subcategory and product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const subcategoryCountOld = await SubCategory.countDocuments({
          category: category._id,
        });

        const subcategoryCountNew = await Category.countDocuments({
          parentId: category._id,
        });
        
        const subcategoryCount = subcategoryCountOld + subcategoryCountNew;

        const productCount = await Product.countDocuments({
          category: category._id, // Note: Product model uses 'category', not 'categoryId'
        });

        return {
          ...category.toObject(),
          totalSubcategory: subcategoryCount,
          totalProduct: productCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categoriesWithCounts,
    });
  }
);

/**
 * Get category by ID
 */
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const category = isObjectId ? await Category.findById(id) : await Category.findOne({ slug: id });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategoryCountOld = await SubCategory.countDocuments({
      category: category._id,
    });

    const subcategoryCountNew = await Category.countDocuments({
      parentId: category._id,
    });
    
    const subcategoryCount = subcategoryCountOld + subcategoryCountNew;

    const productCount = await Product.countDocuments({
      categoryId: category._id,
    });

    const categoryWithCounts = {
      ...category.toObject(),
      totalSubcategory: subcategoryCount,
      totalProduct: productCount,
    };

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: categoryWithCounts,
    });
  }
);

/**
 * Get subcategories by parent category ID
 * Supports both old SubCategory model and new Category model (with parentId)
 */
export const getSubcategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      search,
      page = "1",
      limit = "10",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Verify parent category exists
    const parentCategory = isObjectId ? await Category.findById(id) : await Category.findOne({ slug: id });
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort: any = {};
    const sortField =
      sortBy === "subcategoryName" ? "name" : (sortBy as string);
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    // Build search query
    const searchQuery = search
      ? { $regex: search as string, $options: "i" }
      : undefined;

    // 1. Get subcategories from new Category model (where parentId = category id)
    const categorySubcategoriesQuery: any = {
      parentId: parentCategory._id,
      status: "Active", // Only active subcategories
    };
    if (searchQuery) {
      categorySubcategoriesQuery.name = searchQuery;
    }

    const categorySubcategories = await Category.find(
      categorySubcategoriesQuery
    )
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // 2. Get subcategories from old SubCategory model (for backward compatibility)
    const oldSubcategoryQuery: any = { category: parentCategory._id };
    if (searchQuery) {
      oldSubcategoryQuery.name = searchQuery;
    }

    const oldSubcategories = await SubCategory.find(oldSubcategoryQuery)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Combine both results
    const allSubcategories = [
      ...categorySubcategories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
        subcategoryName: cat.name, // Map name to subcategoryName for frontend compatibility
        categoryName: parentCategory.name,
        image: cat.image,
        subcategoryImage: cat.image,
        order: cat.order || 0,
        totalProduct: 0, // Will be calculated below
        isNewModel: true, // Flag to identify new model
      })),
      ...oldSubcategories.map((sub) => ({
        _id: sub._id,
        name: sub.name,
        subcategoryName: sub.name,
        categoryName: parentCategory.name,
        image: sub.image,
        subcategoryImage: sub.image,
        order: sub.order || 0,
        totalProduct: 0, // Will be calculated below
        isNewModel: false, // Flag to identify old model
      })),
    ];

    // Remove duplicates (in case same subcategory exists in both models)
    const uniqueSubcategories = Array.from(
      new Map(
        allSubcategories.map((item) => [item._id.toString(), item])
      ).values()
    );

    // Sort combined results
    uniqueSubcategories.sort((a, b) => {
      const aValue = (a as any)[sortField] || "";
      const bValue = (b as any)[sortField] || "";
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination to combined results
    const paginatedSubcategories = uniqueSubcategories.slice(
      skip,
      skip + limitNum
    );

    // Get product counts for each subcategory
    const subcategoriesWithCounts = await Promise.all(
      paginatedSubcategories.map(async (subcategory) => {
        // Count products - check both old and new models
        const productCountOld = await Product.countDocuments({
          subcategory: subcategory._id,
        });

        // For new model, products might reference category directly
        const productCountNew = await Product.countDocuments({
          category: subcategory._id,
        });

        const totalProduct = productCountOld + productCountNew;

        return {
          ...subcategory,
          totalProduct,
        };
      })
    );

    // Get total count for pagination
    const totalCategorySubs = await Category.countDocuments(
      categorySubcategoriesQuery
    );
    const totalOldSubs = await SubCategory.countDocuments(oldSubcategoryQuery);
    const total = totalCategorySubs + totalOldSubs;

    return res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully",
      data: subcategoriesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

/**
 * Get all categories with their subcategories nested
 */
export const getAllCategoriesWithSubcategories = asyncHandler(
  async (_req: Request, res: Response) => {
    // Get all parent categories
    const parentCategories = await Category.find({ parentId: null }).sort({
      name: 1,
    });

    // Get all subcategories grouped by parent
    const categoriesWithSubcategories = await Promise.all(
      parentCategories.map(async (category) => {
        const subcategories = await SubCategory.find({
          category: category._id,
        }).sort({ name: 1 });

        // Get product counts
        const subcategoriesWithCounts = await Promise.all(
          subcategories.map(async (subcategory) => {
            const productCount = await Product.countDocuments({
              subcategory: subcategory._id,
            });

            return {
              ...subcategory.toObject(),
              totalProduct: productCount,
            };
          })
        );

        const subcategoryCount = subcategories.length;
        const productCount = await Product.countDocuments({
          category: category._id,
        });

        return {
          ...category.toObject(),
          totalSubcategory: subcategoryCount,
          totalProduct: productCount,
          subcategories: subcategoriesWithCounts,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Categories with subcategories fetched successfully",
      data: categoriesWithSubcategories,
    });
  }
);

/**
 * Get all subcategories (across all categories)
 */
export const getAllSubcategories = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      search,
      page = "1",
      limit = "10",
      sortBy = "subcategoryName",
      sortOrder = "asc",
    } = req.query;

    // Build Search Query
    const searchQuery = search
      ? { name: { $regex: search as string, $options: "i" } }
      : {};

    // 1. Get all top-level categories to identify their children (subcategories)
    const topLevelCategories = await Category.find({ parentId: null }).select("_id name");
    const topLevelIds = topLevelCategories.map(c => c._id);
    const topLevelMap = new Map(topLevelCategories.map(c => [c._id.toString(), c.name]));

    // 2. Fetch subcategories from new Category model (level 1)
    const categorySubQuery: any = { 
        parentId: { $in: topLevelIds },
        ...searchQuery
    };
    const categorySubs = await Category.find(categorySubQuery).lean();

    // 3. Fetch subcategories from old SubCategory model
    const subCategoryQuery: any = { ...searchQuery };
    const oldSubs = await SubCategory.find(subCategoryQuery).populate("category", "name").lean();

    // 4. Combine and Format
    const allSubs = [
      ...categorySubs.map(cat => ({
        _id: cat._id,
        id: cat._id.toString(),
        categoryName: topLevelMap.get(cat.parentId?.toString() || "") || "Unknown",
        subcategoryName: cat.name,
        subcategoryImage: cat.image || "",
        totalProduct: 0, // Calculated below
        createdAt: cat.createdAt
      })),
      ...oldSubs.map(sub => ({
        _id: sub._id,
        id: sub._id.toString(),
        categoryName: (sub.category as any)?.name || "Unknown",
        subcategoryName: sub.name,
        subcategoryImage: sub.image || "",
        totalProduct: 0, // Calculated below
        createdAt: sub.createdAt
      }))
    ];

    // 5. Unique by ID
    const uniqueSubs = Array.from(
      new Map(allSubs.map(item => [item.id, item])).values()
    );

    // 6. Sort
    const sortMultiplier = sortOrder === "desc" ? -1 : 1;
    uniqueSubs.sort((a, b) => {
        let valA: any = (a as any)[sortBy as string] || "";
        let valB: any = (b as any)[sortBy as string] || "";
        
        if (sortBy === "id") { valA = a._id.toString(); valB = b._id.toString(); }

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return -1 * sortMultiplier;
        if (valA > valB) return 1 * sortMultiplier;
        return 0;
    });

    // 7. Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const total = uniqueSubs.length;
    
    const paginatedSubs = uniqueSubs.slice(skip, skip + limitNum);

    // 8. Product Counts
    const dataWithCounts = await Promise.all(
      paginatedSubs.map(async (sub) => {
        const productCount = await Product.countDocuments({
          $or: [
            { subcategory: sub._id },
            { category: sub._id }
          ]
        });
        return { ...sub, totalProduct: productCount };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully",
      data: dataWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

/**
 * Get sub-subcategories by subcategory ID
 */
export const getSubSubCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { subCategoryId } = req.params;
    const { search, isActive } = req.query;

    // Query Category model where parentId is the subcategory ID
    const query: any = { parentId: subCategoryId };

    if (isActive === "true") {
      query.status = "Active";
    }

    if (search) {
      query.name = { $regex: search as string, $options: "i" };
    }

    const subSubCategories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Sub-subcategories fetched successfully",
      data: subSubCategories,
    });
  }
);
