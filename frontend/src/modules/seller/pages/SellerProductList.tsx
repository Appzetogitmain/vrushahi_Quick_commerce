import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProducts,
  deleteProduct,
  Product,
  ProductVariation,
} from "../../../services/api/productService";
import {
  getCategories,
  Category as apiCategory,
} from "../../../services/api/categoryService";
import { useAuth } from "../../../context/AuthContext";

// ... (interfaces remain same)

export default function SellerProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Category");
  const [statusFilter, setStatusFilter] = useState("All Products");
  const [stockFilter, setStockFilter] = useState("All Products");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [totalPages, setTotalPages] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [allCategories, setAllCategories] = useState<apiCategory[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const { user } = useAuth();

  // Close export dropdown when clicking anywhere else
  useEffect(() => {
    if (!showExportDropdown) return;
    const handleClose = () => setShowExportDropdown(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [showExportDropdown]);

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const response = await getCategories();
        if (response.success && response.data) {
          setAllCategories(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCats();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = {
        page: currentPage,
        limit: rowsPerPage,
        sortBy: sortColumn || "createdAt",
        sortOrder: sortDirection,
      };

      const cleanSearch = searchTerm.trim().replace(/\s+/g, " ");
      if (cleanSearch) {
        params.search = cleanSearch;
      }
      if (categoryFilter !== "All Category") {
        params.category = categoryFilter;
      }
      if (statusFilter === "Published") {
        params.status = "published";
      } else if (statusFilter === "Unpublished") {
        params.status = "unpublished";
      }
      if (stockFilter === "In Stock") {
        params.stock = "inStock";
      } else if (stockFilter === "Out of Stock") {
        params.stock = "outOfStock";
      }

      const response = await getProducts(params);
      if (response.success && response.data) {
        setProducts(response.data);
        // Extract pagination info if available
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
          setPaginationInfo(response.pagination);
        } else {
          // Fallback: calculate pages from data length if pagination not available
          setTotalPages(Math.ceil(response.data.length / rowsPerPage));
          setPaginationInfo(null);
        }
      } else {
        setError(response.message || "Failed to fetch products");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to fetch products"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [
    currentPage,
    rowsPerPage,
    searchTerm,
    categoryFilter,
    statusFilter,
    stockFilter,
    sortColumn,
    sortDirection,
  ]);

  const handleDelete = async (productId: string) => {
    try {
      const response = await deleteProduct(productId);
      if (
        response.success ||
        response.message === "Product deleted successfully"
      ) {
        fetchProducts();
      } else {
        console.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleEdit = (productId: string) => {
    navigate(`/seller/product/edit/${productId}`);
  };

  // ... (rest of logic: flatten, filter, sort)

  // Flatten products with variations for display
  // Handle products with no variations by creating a default variation entry
  const allVariations = products.flatMap((product) => {
    // If product has no variations, create a default one
    if (!product.variations || product.variations.length === 0) {
      return [{
        variationId: `${product._id}-default`,
        productName: product.productName,
        sellerName: user?.storeName || "",
        productImage:
          product.mainImage ||
          product.mainImageUrl ||
          "/assets/product-placeholder.jpg",
        brandName: (product.brand as any)?.name || "-",
        category: (product.category as any)?.name || "-",
        categoryId: (product.category as any)?._id || product.category,
        subCategory: (product.subcategory as any)?.name || "-",
        price: product.price || 0,
        discPrice: product.discPrice || 0,
        variation: "Default",
        isPopular: product.popular,
        productId: product._id,
        publish: product.publish,
        stock: product.stock || 0,
      }];
    }
    // If product has variations, map them
    return product.variations.map((variation, index) => ({
      variationId: variation._id || `${product._id}-${index}`,
      productName: product.productName,
      sellerName: user?.storeName || "",
      productImage:
        product.mainImage ||
        product.mainImageUrl ||
        "/assets/product-placeholder.jpg",
      brandName: (product.brand as any)?.name || "-",
      category: (product.category as any)?.name || "-",
      categoryId: (product.category as any)?._id || product.category,
      subCategory: (product.subcategory as any)?.name || "-",
      price: variation.price,
      discPrice: variation.discPrice,
      variation:
        variation.title || variation.value || variation.name || "Default",
      isPopular: product.popular,
      productId: product._id,
      publish: product.publish,
      stock: variation.stock || 0,
    }));
  });

  // Filter variations
  const cleanSearch = searchTerm.trim().toLowerCase().replace(/\s+/g, " ");
  let filteredVariations = allVariations.filter((variation) => {
    const matchesSearch =
      !cleanSearch ||
      variation.productName.toLowerCase().includes(cleanSearch) ||
      variation.sellerName.toLowerCase().includes(cleanSearch) ||
      variation.brandName.toLowerCase().includes(cleanSearch);
    
    const matchesCategory =
      categoryFilter === "All Category" ||
      variation.categoryId === categoryFilter ||
      variation.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "Published") {
      matchesStatus = variation.publish === true;
    } else if (statusFilter === "Unpublished") {
      matchesStatus = variation.publish === false;
    }

    let matchesStock = true;
    if (stockFilter === "In Stock") {
      matchesStock = (variation.stock || 0) > 0;
    } else if (stockFilter === "Out of Stock") {
      matchesStock = (variation.stock || 0) <= 0;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  // Sort variations
  if (sortColumn) {
    filteredVariations.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  // When using API pagination, don't do client-side pagination on already-paginated results
  // The API already returns the correct page of products, so we use all filtered variations
  // Only do client-side pagination if we don't have server-side pagination info
  const useServerPagination = totalPages > 1 && paginationInfo !== null;
  const displayTotalPages = useServerPagination
    ? totalPages
    : Math.ceil(filteredVariations.length / rowsPerPage);

  // Calculate start and end indices for display
  const startIndex = useServerPagination
    ? (paginationInfo!.page - 1) * paginationInfo!.limit
    : (currentPage - 1) * rowsPerPage;
  const endIndex = useServerPagination
    ? Math.min(startIndex + paginationInfo!.limit, paginationInfo!.total)
    : Math.min(currentPage * rowsPerPage, filteredVariations.length);

  // Only slice if NOT using server pagination (i.e., all data is loaded)
  const displayedVariations = useServerPagination
    ? filteredVariations
    : filteredVariations.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const SortIcon = ({ column }: { column: string }) => (
    <span className="text-neutral-300 text-[10px]">
      {sortColumn === column ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}
    </span>
  );

  // Get unique categories for filter
  const categories = allCategories.map((cat) => cat.name);

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Product List
        </h1>
        <div className="text-sm text-blue-500">
          <span className="cursor-pointer hover:underline">Home</span>{" "}
          <span className="text-neutral-400">/</span>{" "}
          <span className="text-neutral-600">Dashboard</span>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex-1 flex flex-col">
        <div className="p-4 border-b border-neutral-100 font-medium text-neutral-700">
          View Product List
        </div>

        {/* Filters and Controls */}
        <div className="p-4 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center justify-between border-b border-neutral-100">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                Filter By Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                <option value="All Category">All Category</option>
                {allCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                <option value="All Products">All Products</option>
                <option value="Published">Published</option>
                <option value="Unpublished">Unpublished</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                Filter by Stock
              </label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                <option value="All Products">All Products</option>
                <option value="In Stock">In Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportDropdown(!showExportDropdown);
                }}
                className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm select-none cursor-pointer">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Export</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${showExportDropdown ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    Export Options
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const headers = [
                        "Product Id",
                        "Variation Id",
                        "Product Name",
                        "Seller Name",
                        "Brand Name",
                        "Category",
                        "Price",
                        "Disc Price",
                        "Variation",
                      ];
                      const csvContent = [
                        headers.join(","),
                        ...filteredVariations.map((v) =>
                          [
                            v.productId,
                            v.variationId,
                            `"${v.productName.replace(/"/g, '""')}"`,
                            `"${v.sellerName.replace(/"/g, '""')}"`,
                            `"${v.brandName.replace(/"/g, '""')}"`,
                            `"${v.category.replace(/"/g, '""')}"`,
                            v.price,
                            v.discPrice,
                            `"${v.variation.replace(/"/g, '""')}"`,
                          ].join(",")
                        ),
                      ].join("\n");
                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const link = document.createElement("a");
                      const url = URL.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute(
                        "download",
                        `products_csv_${new Date().toISOString().split("T")[0]}.csv`
                      );
                      link.style.visibility = "hidden";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-teal-600">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>Export as CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const headers = [
                        "Product Id",
                        "Variation Id",
                        "Product Name",
                        "Seller Name",
                        "Brand Name",
                        "Category",
                        "Price",
                        "Disc Price",
                        "Variation",
                      ];
                      const BOM = "\uFEFF";
                      const csvContent = [
                        headers.join(","),
                        ...filteredVariations.map((v) =>
                          [
                            v.productId,
                            v.variationId,
                            `"${v.productName.replace(/"/g, '""')}"`,
                            `"${v.sellerName.replace(/"/g, '""')}"`,
                            `"${v.brandName.replace(/"/g, '""')}"`,
                            `"${v.category.replace(/"/g, '""')}"`,
                            v.price,
                            v.discPrice,
                            `"${v.variation.replace(/"/g, '""')}"`,
                          ].join(",")
                        ),
                      ].join("\n");
                      const blob = new Blob([BOM + csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const link = document.createElement("a");
                      const url = URL.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute(
                        "download",
                        `products_excel_${new Date().toISOString().split("T")[0]}.csv`
                      );
                      link.style.visibility = "hidden";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-green-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    <span>Export for Excel</span>
                  </button>

                  <div className="border-t border-neutral-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-neutral-500">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    <span>Print Table</span>
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="pl-9 pr-3 py-1.5 bg-neutral-100 hover:bg-neutral-200/60 focus:bg-white border border-transparent focus:border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:outline-none w-56 transition-all font-medium text-neutral-800 placeholder-neutral-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center text-neutral-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
            Loading products...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse border border-neutral-200">
            <thead>
              <tr className="bg-neutral-50 text-xs font-bold text-neutral-800">
                <th className="p-4 w-16 border border-neutral-200">
                  <div className="flex items-center justify-between">
                    Product Id
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("variationId")}>
                  <div className="flex items-center justify-between">
                    Variation Id <SortIcon column="variationId" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("productName")}>
                  <div className="flex items-center justify-between">
                    Product Name <SortIcon column="productName" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("sellerName")}>
                  <div className="flex items-center justify-between">
                    Seller Name <SortIcon column="sellerName" />
                  </div>
                </th>
                <th className="p-4 border border-neutral-200">
                  <div className="flex items-center justify-between">
                    product Image
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("brandName")}>
                  <div className="flex items-center justify-between">
                    Brand Name <SortIcon column="brandName" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("category")}>
                  <div className="flex items-center justify-between">
                    Category <SortIcon column="category" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("subCategory")}>
                  <div className="flex items-center justify-between">
                    SubCategory <SortIcon column="subCategory" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("price")}>
                  <div className="flex items-center justify-between">
                    Price <SortIcon column="price" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("discPrice")}>
                  <div className="flex items-center justify-between">
                    Disc Price <SortIcon column="discPrice" />
                  </div>
                </th>
                <th
                  className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort("variation")}>
                  <div className="flex items-center justify-between">
                    Variation <SortIcon column="variation" />
                  </div>
                </th>
                <th className="p-4 border border-neutral-200">
                  <div className="flex items-center justify-center">Action</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedVariations.map((variation, index) => {
                const isFirstVariation =
                  index === 0 ||
                  displayedVariations[index - 1].productId !==
                    variation.productId;
                const product = products.find(
                  (p) => p._id === variation.productId
                );
                const hasMultipleVariations =
                  product && product.variations.length > 1;
                const isExpanded = expandedProducts.has(variation.productId);

                return (
                  <tr
                    key={`${variation.productId}-${variation.variationId}`}
                    className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700">
                    <td className="p-4 align-middle border border-neutral-200">
                      <div className="flex items-center gap-2">
                        {isFirstVariation && hasMultipleVariations && (
                          <button
                            onClick={() => toggleProduct(variation.productId)}
                            className="text-blue-600 hover:text-blue-700">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              {isExpanded ? (
                                <polyline points="6 9 12 15 18 9"></polyline>
                              ) : (
                                <polyline points="9 18 15 12 9 6"></polyline>
                              )}
                            </svg>
                          </button>
                        )}
                        <span>{variation.productId}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.variationId}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      <div className="flex flex-col gap-1">
                        <span>{variation.productName}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.sellerName}
                    </td>
                    <td className="p-4 border border-neutral-200">
                      <div className="w-16 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center mx-auto">
                        <img
                          src={variation.productImage}
                          alt={variation.productName}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/60x40?text=Img";
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.brandName || "-"}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.category}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.subCategory}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      ₹{variation.price.toFixed(2)}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.discPrice > 0
                        ? `₹${variation.discPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      {variation.variation}
                    </td>
                    <td className="p-4 align-middle border border-neutral-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(variation.productId)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Product">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(variation.productId)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Product">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedVariations.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="p-8 text-center text-neutral-400 border border-neutral-200">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && (
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {startIndex + 1} to {endIndex} of{" "}
            {useServerPagination && paginationInfo
              ? paginationInfo.total
              : filteredVariations.length}{" "}
            entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 border border-teal-600 rounded ${
                currentPage === 1
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-teal-600 hover:bg-teal-50"
              }`}
              aria-label="Previous page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 border border-teal-600 rounded font-medium text-sm ${
                    currentPage === page
                      ? "bg-teal-600 text-white"
                      : "text-teal-600 hover:bg-teal-50"
                  }`}>
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(displayTotalPages, prev + 1))
              }
              disabled={currentPage === displayTotalPages}
              className={`p-2 border border-teal-600 rounded ${
                currentPage === displayTotalPages
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-teal-600 hover:bg-teal-50"
              }`}
              aria-label="Next page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
