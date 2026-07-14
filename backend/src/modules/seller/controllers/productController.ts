import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../../../models/Product";
import { asyncHandler } from "../../../utils/asyncHandler";
import { populateProductsSubcategory } from "../../../utils/productHelper";
import xlsx from "xlsx";
import HeaderCategory from "../../../models/HeaderCategory";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Brand from "../../../models/Brand";
import Tax from "../../../models/Tax";

/**
 * Create a new product
 */
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const productData = req.body;

    // Ensure sellerId matches authenticated seller
    if (productData.sellerId && productData.sellerId !== sellerId) {
      return res.status(403).json({
        success: false,
        message: "You can only create products for your own account",
      });
    }

    // 2. Map fields to match Product model
    const newProductData: any = {
      ...productData,
      seller: sellerId, // Map sellerId to seller
      headerCategoryId: productData.headerCategoryId, // Map headerCategoryId
      category: productData.categoryId, // Map categoryId to category
      subcategory: productData.subcategoryId,
      brand: productData.brandId,
      mainImage: productData.mainImageUrl, // Map mainImageUrl to mainImage
      galleryImages: productData.galleryImageUrls,
    };

    // Map variations: Ensure 'title' from frontend is mapped to 'value' (or name) expected by Schema
    if (newProductData.variations) {
      newProductData.variations = newProductData.variations.map((v: any) => ({
        ...v,
        value: v.value || v.title, // Map title to value
        name: v.name || "Variation", // Default name
        discPrice: v.discPrice || 0,
        status: v.status || "Available",
      }));
    }

    // 3. Set Price and Stock from Variations
    // The Product model requires a top-level price and stock
    if (newProductData.variations && newProductData.variations.length > 0) {
      // Use the price of the first variation as the base price
      newProductData.price = newProductData.variations[0].price;
      newProductData.discPrice = newProductData.variations[0].discPrice || 0;

      // Calculate total stock (sum of all variations)
      // Note: If any variation has stock 0 (unlimited), how should we handle top level?
      // For now, let's sum them up. If purely unlimited, logic might differ.
      newProductData.stock = newProductData.variations.reduce(
        (acc: number, curr: any) => acc + (parseInt(curr.stock) || 0),
        0
      );
    }

    // 4. Validate Price (Model requirement)
    if (newProductData.price === undefined || newProductData.price === null) {
      return res.status(400).json({
        success: false,
        message: "Product price is required (add at least one variation)",
      });
    }

    // Validate minimum one image uploaded (either cover image or in variation)
    const hasCoverImage = !!newProductData.mainImage;
    const hasVariationImage = newProductData.variations?.some((v: any) => !!v.image);
    if (!hasCoverImage && !hasVariationImage) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required! Please upload a Cover Image or add an image for at least one variation.",
      });
    }

    // 5. Clean up undefined fields
    if (!newProductData.headerCategoryId)
      delete newProductData.headerCategoryId;
    if (!newProductData.subcategory) delete newProductData.subcategory;
    if (!newProductData.brand) delete newProductData.brand;

    // Handle Tax: Frontend sends taxId, Model expects 'tax' (string) or something else?
    // Checking SellerAddProduct.tsx sending taxId -> formData.tax
    // Model Product.ts -> tax: { type: String }
    // Ideally we should store the Tax ID or Name. Since frontend sends ID, let's map it.
    if (productData.taxId) {
      newProductData.tax = productData.taxId;
    }

    // Validate variation prices and stock
    if (newProductData.variations) {
      for (const variation of newProductData.variations) {
        if (Number(variation.price) <= 0) {
          return res.status(400).json({
            success: false,
            message: `Price must be greater than 0 for variation ${variation.title || variation.value}`,
          });
        }
        if (Number(variation.stock) <= 0) {
          return res.status(400).json({
            success: false,
            message: `Stock must be greater than 0 for variation ${variation.title || variation.value}`,
          });
        }
        if (Number(variation.discPrice) > Number(variation.price)) {
          return res.status(400).json({
            success: false,
            message: `Discounted price (${variation.discPrice}) cannot be greater than price (${variation.price}) for variation ${variation.title || variation.value}`,
          });
        }
      }
    }

    // 6. Set product status
    newProductData.publish = productData.publish !== undefined ? productData.publish : true;
    newProductData.status = "Active";
    newProductData.requiresApproval = false;

    // Set default values for other required fields if not provided
    if (!newProductData.popular) newProductData.popular = false;
    if (!newProductData.dealOfDay) newProductData.dealOfDay = false;
    if (!newProductData.isReturnable) newProductData.isReturnable = false;
    if (!newProductData.rating) newProductData.rating = 0;
    if (!newProductData.reviewsCount) newProductData.reviewsCount = 0;
    if (!newProductData.discount) newProductData.discount = 0;
    if (!newProductData.tags) newProductData.tags = [];

    // Handle new modern dashboard fields
    if (productData.costPrice !== undefined) newProductData.costPrice = productData.costPrice;
    if (productData.minOrderQuantity !== undefined) newProductData.minOrderQuantity = productData.minOrderQuantity;
    if (productData.maxOrderLimit !== undefined) newProductData.maxOrderLimit = productData.maxOrderLimit;
    if (productData.drugLicNo !== undefined) newProductData.drugLicNo = productData.drugLicNo;
    if (productData.storageInstructions !== undefined) newProductData.storageInstructions = productData.storageInstructions;
    if (productData.cutType !== undefined) newProductData.cutType = productData.cutType;
    if (productData.freshnessLevel !== undefined) newProductData.freshnessLevel = productData.freshnessLevel;
    if (productData.prescriptionRequired !== undefined) newProductData.prescriptionRequired = productData.prescriptionRequired;
    if (productData.warranty !== undefined) newProductData.warranty = productData.warranty;
    if (productData.specs !== undefined) newProductData.specs = productData.specs;
    if (productData.sizeChartUrl !== undefined) newProductData.sizeChartUrl = productData.sizeChartUrl;
    if (productData.attributes !== undefined) newProductData.attributes = productData.attributes;

    const product = await Product.create(newProductData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  }
);

/**
 * Get seller's products with filters
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const {
    search,
    category,
    status,
    stock,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build query
  const query: any = { seller: sellerId };

  // Search filter
  if (search) {
    query.$or = [
      { productName: { $regex: search, $options: "i" } },
      { smallDescription: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search as string, "i")] } },
    ];
  }

  // Category filter
  if (category && category !== "All Category") {
    if (mongoose.Types.ObjectId.isValid(category as string)) {
      query.category = category;
    }
  }

  // Status filter (publish, popular, dealOfDay)
  if (status) {
    if (status === "published") {
      query.publish = true;
    } else if (status === "unpublished") {
      query.publish = false;
    } else if (status === "popular") {
      query.popular = true;
    } else if (status === "dealOfDay") {
      query.dealOfDay = true;
    }
  }

  // Stock filter
  if (stock === "inStock") {
    query.stock = { $gt: 0 };
  } else if (stock === "outOfStock") {
    query.stock = 0;
  }

  // Pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const products = await Product.find(query)
    .populate("category", "name")
    .populate("brand", "name")
    .populate("tax", "name rate")
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

  await populateProductsSubcategory(products);

  const total = await Product.countDocuments(query);

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    data: products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * Get product by ID
 */
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;

    // Prevent reserved route names from being treated as product IDs
    const reservedRoutes = ["shops", "brands"];
    if (reservedRoutes.includes(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await Product.findOne({ _id: id, seller: sellerId })
      .populate("category", "name")
      .populate("headerCategoryId", "name slug")
      .populate("brand", "name")
      .populate("tax", "name rate")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await populateProductsSubcategory(product);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  }
);

/**
 * Update product
 */
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;
    const updateData = req.body;

    console.log("DEBUG updateProduct: sellerId from token:", sellerId);
    console.log("DEBUG updateProduct: productId:", id);

    // Remove sellerId from update data if present (cannot change owner)
    delete updateData.sellerId;

    // Map frontend field names to model field names (same as createProduct)
    if (updateData.headerCategoryId !== undefined) {
      // Allow null/empty to clear header category
      updateData.headerCategoryId = updateData.headerCategoryId || null;
    }
    if (updateData.categoryId) {
      updateData.category = updateData.categoryId;
      delete updateData.categoryId;
    }
    if (updateData.subcategoryId) {
      updateData.subcategory = updateData.subcategoryId;
      delete updateData.subcategoryId;
    }
    if (updateData.brandId) {
      updateData.brand = updateData.brandId;
      delete updateData.brandId;
    }
    if (updateData.taxId) {
      updateData.tax = updateData.taxId;
      delete updateData.taxId;
    }
    if (updateData.mainImageUrl) {
      updateData.mainImage = updateData.mainImageUrl;
      delete updateData.mainImageUrl;
    }
    if (updateData.galleryImageUrls) {
      updateData.galleryImages = updateData.galleryImageUrls;
      delete updateData.galleryImageUrls;
    }

    // Validate variations if provided
    if (updateData.variations) {
      if (updateData.variations.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Product must have at least one variation",
        });
      }

      // Map variations and validate prices
      updateData.variations = updateData.variations.map((v: any) => ({
        ...v,
        value: v.value || v.title,
        name: v.name || "Variation",
        discPrice: v.discPrice || 0,
        status: v.status || "Available",
      }));

      for (const variation of updateData.variations) {
        if (Number(variation.price) <= 0) {
          return res.status(400).json({
            success: false,
            message: `Price must be greater than 0 for variation ${variation.title || variation.value}`,
          });
        }
        if (Number(variation.stock) <= 0) {
          return res.status(400).json({
            success: false,
            message: `Stock must be greater than 0 for variation ${variation.title || variation.value}`,
          });
        }
        if (Number(variation.discPrice) > Number(variation.price)) {
          return res.status(400).json({
            success: false,
            message: `Discounted price cannot be greater than price for variation ${
              variation.title || variation.value
            }`,
          });
        }
      }

      // Sync top-level price and stock from variations (same as createProduct)
      updateData.price = updateData.variations[0].price;
      updateData.discPrice = updateData.variations[0].discPrice || 0;
      updateData.stock = updateData.variations.reduce(
        (acc: number, curr: any) => acc + (parseInt(curr.stock) || 0),
        0
      );
    }

    // Map new modern dashboard fields for update
    if (updateData.costPrice !== undefined) updateData.costPrice = updateData.costPrice;
    if (updateData.minOrderQuantity !== undefined) updateData.minOrderQuantity = updateData.minOrderQuantity;
    if (updateData.maxOrderLimit !== undefined) updateData.maxOrderLimit = updateData.maxOrderLimit;
    if (updateData.drugLicNo !== undefined) updateData.drugLicNo = updateData.drugLicNo;
    if (updateData.storageInstructions !== undefined) updateData.storageInstructions = updateData.storageInstructions;
    if (updateData.cutType !== undefined) updateData.cutType = updateData.cutType;
    if (updateData.freshnessLevel !== undefined) updateData.freshnessLevel = updateData.freshnessLevel;
    if (updateData.prescriptionRequired !== undefined) updateData.prescriptionRequired = updateData.prescriptionRequired;
    if (updateData.warranty !== undefined) updateData.warranty = updateData.warranty;
    if (updateData.specs !== undefined) updateData.specs = updateData.specs;
    if (updateData.sizeChartUrl !== undefined) updateData.sizeChartUrl = updateData.sizeChartUrl;
    if (updateData.attributes !== undefined) updateData.attributes = updateData.attributes;

    // Use findOne and then save to trigger pre-save hooks
    const product = await Product.findOne({ _id: id, seller: sellerId });

    if (!product) {
      // Check if product exists at all
      const existingProduct = await Product.findById(id).select("seller");
      if (existingProduct) {
        console.log(
          "DEBUG updateProduct: product exists but owned by:",
          existingProduct.seller
        );
      }
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate minimum one image uploaded if variations or main image are being updated
    if (updateData.variations !== undefined || updateData.mainImage !== undefined) {
      const hasCoverImage = updateData.mainImage !== undefined ? !!updateData.mainImage : !!product.mainImage;
      const hasVariationImage = updateData.variations !== undefined 
        ? updateData.variations.some((v: any) => !!v.image) 
        : (product.variations || []).some((v: any) => !!v.image);
      
      if (!hasCoverImage && !hasVariationImage) {
        return res.status(400).json({
          success: false,
          message: "At least one image is required! Please upload a Cover Image or add an image for at least one variation.",
        });
      }
    }

    // Apply updates
    Object.assign(product, updateData);

    // If variations were updated, mark as modified
    if (updateData.variations) {
      product.markModified("variations");
    }

    await product.save();

    // Re-populate for response
    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subcategory", "subcategoryName")
      .populate("headerCategoryId", "name slug")
      .populate("brand", "name")
      .populate("tax", "name rate");

    console.log("DEBUG updateProduct: product updated successfully");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: populatedProduct,
    });
  }
);

/**
 * Delete product
 */
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;

    console.log("DEBUG deleteProduct: sellerId from token:", sellerId);
    console.log("DEBUG deleteProduct: productId:", id);

    const product = await Product.findOneAndDelete({
      _id: id,
      seller: sellerId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  }
);

/**
 * Update stock for a product variation
 */
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const { id, variationId } = req.params;
  const { stock, status } = req.body;

  const product = await Product.findOne({ _id: id, seller: sellerId });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const variation: any = product.variations?.find(
    (v: any) => v._id?.toString() === variationId
  );
  if (!variation) {
    return res.status(404).json({
      success: false,
      message: "Variation not found",
    });
  }

  if (stock !== undefined) {
    variation.stock = stock;
    // Automatically update status based on stock
    if (stock === 0) {
      variation.status = "Sold out";
    } else if (stock > 0 && variation.status === "Sold out") {
      variation.status = "Available";
    }
  }
  if (status) {
    variation.status = status;
  }

  // Mark variations as modified since we updated a sub-document field
  product.markModified("variations");
  await product.save();

  return res.status(200).json({
    success: true,
    message: "Stock updated successfully",
    data: product,
  });
});

/**
 * Update product status (publish, popular, dealOfDay)
 */
export const updateProductStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;
    const { publish, popular, dealOfDay } = req.body;

    const updateData: any = {};
    if (publish !== undefined) updateData.publish = publish;
    if (popular !== undefined) updateData.popular = popular;
    if (dealOfDay !== undefined) updateData.dealOfDay = dealOfDay;

    const product = await Product.findOneAndUpdate(
      { _id: id, seller: sellerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully",
      data: product,
    });
  }
);

/**
 * Bulk update stock for multiple products/variations
 */
export const bulkUpdateStock = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { updates } = req.body; // Array of { productId, variationId, stock }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: "Updates must be an array",
      });
    }

    const results = [];
    for (const update of updates) {
      const { productId, variationId, stock } = update;

      const product = await Product.findOne({
        _id: productId,
        seller: sellerId,
      });
      if (product) {
        const variation: any = product.variations?.find(
          (v: any) => v._id?.toString() === variationId
        );
        if (variation) {
          variation.stock = stock;
          if (stock === 0) variation.status = "Sold out";
          else if (stock > 0 && variation.status === "Sold out")
            variation.status = "In stock";

          await product.save();
          results.push({ productId, variationId, success: true });
        } else {
          results.push({
            productId,
            variationId,
            success: false,
            message: "Variation not found",
          });
        }
      } else {
        results.push({
          productId,
          variationId,
          success: false,
          message: "Product not found",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk stock update processed",
      data: results,
    });
  }
);

/**
 * Bulk upload products via Excel
 */
export const bulkUploadProducts = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Parse Excel
  const workbook = xlsx.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  if (!rows || rows.length === 0) {
    return res.status(400).json({ success: false, message: "Excel file is empty" });
  }

  // Pre-fetch mappings
  const [headerCategories, categories, subCategories, brands, taxes] = await Promise.all([
    HeaderCategory.find().lean(),
    Category.find().lean(),
    SubCategory.find().lean(),
    Brand.find().lean(),
    Tax.find().lean()
  ]);

  const headerCatMap = new Map(headerCategories.map(h => [h.name.toLowerCase(), h._id]));
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c._id]));
  const subCatMap = new Map(subCategories.map(s => [s.name.toLowerCase(), s._id]));
  const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b._id]));
  const taxMap = new Map(taxes.map(t => [t.name.toLowerCase(), t._id]));

  const validProducts: any[] = [];
  const errors: { row: number; error: string }[] = [];

  // Group by Product Name if "Variant Title" exists
  const isVariantTemplate = rows.some((row) => row["Variant Title"] !== undefined);

  if (isVariantTemplate) {
    const productGroups = new Map<string, any[]>();
    rows.forEach((row, index) => {
      const name = row["Product Name"];
      if (!name) {
         errors.push({ row: index + 2, error: "Product Name is required" });
         return;
      }
      if (!productGroups.has(name)) productGroups.set(name, []);
      productGroups.get(name)!.push({ ...row, _originalRowIndex: index + 2 });
    });

    for (const [productName, variationsRows] of productGroups.entries()) {
      const firstRow = variationsRows[0];
      const rowNum = firstRow._originalRowIndex;

      try {
        const headerCatId = headerCatMap.get(firstRow["Header Category"]?.toString().trim().toLowerCase());
        const catId = catMap.get(firstRow["Category"]?.toString().trim().toLowerCase());
        
        if (!headerCatId) throw new Error(`Header Category '${firstRow["Header Category"]}' not found`);
        if (!catId) throw new Error(`Category '${firstRow["Category"]}' not found`);

        const subCatId = firstRow["SubCategory"] ? subCatMap.get(firstRow["SubCategory"].toString().trim().toLowerCase()) : undefined;
        const brandId = firstRow["Brand"] ? brandMap.get(firstRow["Brand"].toString().trim().toLowerCase()) : undefined;
        const taxId = firstRow["Tax Class"] ? taxMap.get(firstRow["Tax Class"].toString().trim().toLowerCase()) : undefined;

        const variations = [];
        for (const vRow of variationsRows) {
          const vRowNum = vRow._originalRowIndex;
          if (!vRow["Variant Title"]) throw new Error(`Variant Title is required (Row ${vRowNum})`);
          if (vRow["Variant MRP"] === undefined) throw new Error(`Variant MRP is required (Row ${vRowNum})`);
          if (vRow["Variant Selling Price"] === undefined) throw new Error(`Variant Selling Price is required (Row ${vRowNum})`);
          if (vRow["Variant Stock"] === undefined) throw new Error(`Variant Stock is required (Row ${vRowNum})`);

          variations.push({
            name: "Variation",
            value: vRow["Variant Title"].toString(),
            price: Number(vRow["Variant MRP"]),
            discPrice: Number(vRow["Variant Selling Price"]),
            stock: Number(vRow["Variant Stock"]),
            sku: vRow["Variant SKU"]?.toString(),
            image: vRow["Variant Image URL"]?.toString(),
            status: Number(vRow["Variant Stock"]) > 0 ? "Available" : "Sold out"
          });
        }

        const product = {
          productName,
          seller: sellerId,
          headerCategoryId: headerCatId,
          category: catId,
          subcategory: subCatId,
          brand: brandId,
          tax: taxId,
          publish: false, // Default false for bulk upload
          status: "Active",
          requiresApproval: false,
          minOrderQuantity: Number(firstRow["Min Order Quantity"]) || 1,
          maxOrderLimit: Number(firstRow["Max Order Limit"]) || 0,
          netQuantity: firstRow["Net Quantity"]?.toString(),
          barcode: firstRow["Barcode"]?.toString(),
          drugLicNo: firstRow["Drug Lic No"]?.toString(),
          manufacturer: firstRow["Manufacturer"]?.toString(),
          madeIn: firstRow["Made In"]?.toString(),
          fssaiLicNo: firstRow["FSSAI Lic No"]?.toString(),
          smallDescription: firstRow["Small Description"]?.toString(),
          description: firstRow["Description"]?.toString(),
          isReturnable: firstRow["Is Returnable"]?.toString().toLowerCase() === "yes",
          maxReturnDays: Number(firstRow["Max Return Days"]) || undefined,
          warranty: firstRow["Warranty"]?.toString(),
          mainImage: firstRow["Image URL"]?.toString() || variations[0]?.image || "",
          galleryImages: firstRow["Gallery Image URLs"] ? firstRow["Gallery Image URLs"].toString().split(',').map((url: string) => url.trim()) : [],
          variations,
          price: variations[0].price,
          discPrice: variations[0].discPrice,
          stock: variations.reduce((acc, curr) => acc + curr.stock, 0),
          compareAtPrice: variations[0].price
        };

        const doc = new Product(product);
        await doc.validate();
        validProducts.push(product);

      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || "Validation failed" });
      }
    }
  } else {
    // Simple Products Template
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row["Product Name"]) throw new Error("Product Name is required");
        if (row["MRP"] === undefined) throw new Error("MRP is required");
        if (row["Selling Price"] === undefined) throw new Error("Selling Price is required");
        if (row["Stock"] === undefined) throw new Error("Stock is required");

        const headerCatId = headerCatMap.get(row["Header Category"]?.toString().trim().toLowerCase());
        const catId = catMap.get(row["Category"]?.toString().trim().toLowerCase());
        
        if (!headerCatId) throw new Error(`Header Category '${row["Header Category"]}' not found`);
        if (!catId) throw new Error(`Category '${row["Category"]}' not found`);

        const subCatId = row["SubCategory"] ? subCatMap.get(row["SubCategory"].toString().trim().toLowerCase()) : undefined;
        const brandId = row["Brand"] ? brandMap.get(row["Brand"].toString().trim().toLowerCase()) : undefined;
        const taxId = row["Tax Class"] ? taxMap.get(row["Tax Class"].toString().trim().toLowerCase()) : undefined;

        const price = Number(row["MRP"]);
        const discPrice = Number(row["Selling Price"]);
        const stock = Number(row["Stock"]);
        const mainImage = row["Image URL"]?.toString() || "";

        const variations = [{
            name: "Variation",
            value: "Default",
            price,
            discPrice,
            stock,
            sku: row["SKU"]?.toString(),
            image: mainImage,
            status: stock > 0 ? "Available" : "Sold out"
        }];

        const product = {
          productName: row["Product Name"].toString(),
          seller: sellerId,
          headerCategoryId: headerCatId,
          category: catId,
          subcategory: subCatId,
          brand: brandId,
          tax: taxId,
          publish: false, 
          status: "Active",
          requiresApproval: false,
          minOrderQuantity: Number(row["Min Order Quantity"]) || 1,
          maxOrderLimit: Number(row["Max Order Limit"]) || 0,
          netQuantity: row["Net Quantity"]?.toString(),
          sku: row["SKU"]?.toString(),
          barcode: row["Barcode"]?.toString(),
          drugLicNo: row["Drug Lic No"]?.toString(),
          manufacturer: row["Manufacturer"]?.toString(),
          madeIn: row["Made In"]?.toString(),
          fssaiLicNo: row["FSSAI Lic No"]?.toString(),
          smallDescription: row["Small Description"]?.toString(),
          description: row["Description"]?.toString(),
          isReturnable: row["Is Returnable"]?.toString().toLowerCase() === "yes",
          maxReturnDays: Number(row["Max Return Days"]) || undefined,
          warranty: row["Warranty"]?.toString(),
          mainImage,
          galleryImages: row["Gallery Image URLs"] ? row["Gallery Image URLs"].toString().split(',').map((url: string) => url.trim()) : [],
          variations,
          price,
          discPrice,
          stock,
          compareAtPrice: price
        };

        const doc = new Product(product);
        await doc.validate();
        validProducts.push(product);

      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || "Validation failed" });
      }
    }
  }

  // Insert valid products
  if (validProducts.length > 0) {
    await Product.insertMany(validProducts);
  }

  return res.status(200).json({
    success: true,
    summary: {
      totalRows: rows.length,
      uploaded: validProducts.length,
      failed: errors.length
    },
    errors
  });
});

/**
 * Get product summary (Total, Published, Draft)
 */
export const getProductSummary = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;

  const [total, published, draft] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Product.countDocuments({ seller: sellerId, publish: true }),
    Product.countDocuments({ seller: sellerId, publish: false }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      published,
      draft,
    },
  });
});
