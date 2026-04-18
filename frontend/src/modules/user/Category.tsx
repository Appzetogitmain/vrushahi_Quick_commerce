import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProducts,
  getCategoryById,
  Category as ApiCategory,
} from "../../services/api/customerProductService";
import { useLocation as useLocationContext } from "../../hooks/useLocation";
import CategoryNotFound from "./components/CategoryNotFound";
import SortModal from "./components/SortModal";
import NoProductsFound from "./components/NoProductsFound";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { location: userLocation } = useLocationContext();

  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{ categories: string[], brands: string[] }>({
    categories: [],
    brands: []
  });
  const [activeFilters, setActiveFilters] = useState<{ categories: string[], brands: string[] }>({
    categories: [],
    brands: []
  });
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<"Categories" | "Brands">("Categories");
  const [sortBy, setSortBy] = useState<string>("relevance"); // Changed from popular to match SortModal
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Category Details
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      setCategoryLoading(true);
      setError(null);
      try {
        if (id === 'all') {
          navigate('/categories', { replace: true });
          return;
        }

        if (id === 'lowest-prices') {
          setCategory({
            _id: 'lowest-prices',
            id: 'lowest-prices',
            name: 'Lowest Prices Ever',
            icon: '🏷️',
            isActive: true,
          } as any);
          setSubcategories([
            {
              _id: "all",
              id: "all",
              name: "All Deals",
              icon: "🔥",
              isActive: true,
            } as any
          ]);
          setCategoryLoading(false);
          return;
        }

        const response = await getCategoryById(id!);
        if (response.success && response.data) {
          const {
            category: cat,
            subcategories: subs,
            currentSubcategory,
          } = response.data;

          setCategory(cat);
          setSubcategories([
            {
              _id: "all",
              id: "all",
              name: "All",
              icon: "📦",
              isActive: true,
            } as any,
            ...(subs || []),
          ]);

          // Check URL query params first, then API response
          const subcategoryFromUrl = searchParams.get("subcategory");
          if (subcategoryFromUrl) {
            setSelectedSubcategory(subcategoryFromUrl);
          } else if (currentSubcategory) {
            setSelectedSubcategory(
              currentSubcategory._id || currentSubcategory.id
            );
          }
        } else {
          setError("Category not found or failed to load details.");
        }
      } catch (error) {
        console.error("Error fetching category details:", error);
        setError("Failed to load category information.");
      } finally {
        setCategoryLoading(false);
      }
    };

    if (id) {
      fetchCategoryDetails();
    }
  }, [id, searchParams]);

  // Fetch Products when category or subcategory changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // If the ID in the URL is actually for a subcategory, we should use the parent category ID
        // which we fetch in the other useEffect and store in 'category'.
        // However, for fetching products, the backend getProducts handles 'category' (parent)
        // and 'subcategory' separately.

        const params: any = {};
        if (id === 'lowest-prices') {
          params.minDiscount = 1;
        } else {
          params.category = category?._id || id;
          if (selectedSubcategory !== "all") {
            params.subcategory = selectedSubcategory;
          }
        }
        // Include user location for seller service radius filtering
        if (userLocation?.latitude && userLocation?.longitude) {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }

        if (sortBy) {
          params.sort = sortBy;
        }

        const response = await getProducts(params);
        if (response.success) {
          // Ensure products have default tags/name array for filtering logic if missing
          const safeProducts = response.data.map((p: any) => ({
            ...p,
            tags: Array.isArray(p.tags) ? p.tags : [],
            nameParts: p.name ? p.name.toLowerCase().split(" ") : [],
          }));
          setProducts(safeProducts);
        } else {
          setError("Failed to fetch products for this category.");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Network error while loading products.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }
  }, [id, selectedSubcategory, category?._id, userLocation, sortBy]);

  // Combined Filtering and Sorting
  const categoryProducts = useMemo(() => {
    let result = [...products];

    // Filter by Categories (Subcategories) from modal
    if (activeFilters.categories.length > 0) {
      result = result.filter((product) => {
        const subId = product.subcategory?._id || product.subcategory;
        return activeFilters.categories.includes(subId?.toString());
      });
    }

    // Filter by Brands
    if (activeFilters.brands.length > 0) {
      result = result.filter((product) => {
        const brandId = product.brand?._id || product.brand?.id || product.brand;
        return activeFilters.brands.includes(brandId?.toString());
      });
    }

    return result;
  }, [products, activeFilters]);

  // Extract unique brands from current products
  const availableBrands = useMemo(() => {
    const brandsMap = new Map<string, string>();
    products.forEach((p) => {
      const brand = p.brand;
      if (brand && (brand.name || brand.productBrandName)) {
        const name = brand.name || brand.productBrandName;
        const id = brand._id || brand.id || name;
        brandsMap.set(id.toString(), name);
      }
    });
    return Array.from(brandsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  if ((categoryLoading || loading) && !products.length && !category) {
    return null; // Let global IconLoader handle it
  }

  if (error && !products.length && !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center bg-white">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm"
        >
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
        <h3 className="text-2xl font-black text-neutral-900 mb-2 tracking-tight">Oops! Something went wrong</h3>
        <p className="text-neutral-500 mb-8 max-w-xs font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  if (!category && !categoryLoading) {
    return (
      <CategoryNotFound 
        slug={id} 
        onExploreAll={() => navigate('/categories')} 
      />
    );
  }

  // Extract filter options from products
  const getFilterOptions = () => {
    const filterMap = new Map<string, number>();

    products.forEach((product) => {
      // Extract main ingredient/type from product name
      const name = (product.productName || product.name || '').toLowerCase();
      // Remove common prefixes like "fresh", "organic", etc.
      const cleanName = name
        .replace(/^(fresh|organic|premium|best|new)\s+/i, "")
        .trim();

      const commonTypes = [
        { keywords: ["tomato", "tomatoes"], display: "Tomato" },
        { keywords: ["potato", "potatoes"], display: "Potato" },
        { keywords: ["chilli", "chili", "chilies"], display: "Chilli" },
        { keywords: ["spinach"], display: "Spinach" },
        { keywords: ["brinjal", "eggplant"], display: "Brinjal" },
        { keywords: ["onion", "onions"], display: "Onion" },
        { keywords: ["peanut", "peanuts"], display: "Peanuts" },
        { keywords: ["lemon", "lemons"], display: "Lemon" },
        { keywords: ["mushroom", "mushrooms"], display: "Mushroom" },
        {
          keywords: ["capsicum", "bell pepper", "pepper"],
          display: "Capsicum",
        },
        { keywords: ["ginger"], display: "Ginger" },
        { keywords: ["carrot", "carrots"], display: "Carrot" },
        { keywords: ["fenugreek", "methi"], display: "Fenugreek" },
        { keywords: ["broccoli"], display: "Broccoli" },
        { keywords: ["cucumber", "cucumbers"], display: "Cucumber" },
        { keywords: ["cabbage"], display: "Cabbage" },
        { keywords: ["cauliflower"], display: "Cauliflower" },
        { keywords: ["ladyfinger", "okra"], display: "Ladyfinger" },
        { keywords: ["beans"], display: "Beans" },
        { keywords: ["peas"], display: "Peas" },
        { keywords: ["garlic"], display: "Garlic" },
        { keywords: ["apple", "apples"], display: "Apple" },
        { keywords: ["banana", "bananas"], display: "Banana" },
        { keywords: ["orange", "oranges"], display: "Orange" },
        { keywords: ["mango", "mangoes"], display: "Mango" },
      ];

      for (const type of commonTypes) {
        if (type.keywords.some((keyword) => cleanName.includes(keyword))) {
          filterMap.set(type.display, (filterMap.get(type.display) || 0) + 1);
          break;
        }
      }
    });

    return Array.from(filterMap.entries())
      .map(([name, count]) => ({ name, count, icon: getIconForFilter(name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getIconForFilter = (name: string): string => {
    const iconMap: Record<string, string> = {
      Tomato: "🍅",
      Potato: "🥔",
      Chilli: "🌶️",
      Spinach: "🥬",
      Brinjal: "🍆",
      Onion: "🧅",
      Peanuts: "🥜",
      Lemon: "🍋",
      Mushroom: "🍄",
      Capsicum: "🫑",
      Ginger: "🫚",
      Carrot: "🥕",
      Fenugreek: "🌿",
      Broccoli: "🥦",
      Cucumber: "🥒",
      Cabbage: "🥬",
      Cauliflower: "🥦",
      Apple: "🍎",
      Banana: "🍌",
      Orange: "🍊",
      Mango: "🥭",
    };
    return iconMap[name] || "🥬";
  };

  const filterOptions = getFilterOptions();
  const filteredOptions = filterOptions.filter((option) =>
    option.name.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const handleFilterToggle = (id: string, type: "categories" | "brands") => {
    setSelectedFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(id)
        ? current.filter((f) => f !== id)
        : [...current, id];
      return { ...prev, [type]: updated };
    });
  };

  const handleClearFilters = () => {
    setSelectedFilters({ categories: [], brands: [] });
    setActiveFilters({ categories: [], brands: [] });
  };

  const handleApplyFilters = () => {
    setActiveFilters(selectedFilters);
    setIsFiltersOpen(false);
  };

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-24 bg-white border-r border-neutral-100 overflow-y-auto scrollbar-hide flex-shrink-0 py-2">
        <div className="space-y-1">
          {subcategories.map((subcat) => {
            const isSelected =
              selectedSubcategory === (subcat.id || subcat._id);
            return (
              <button
                key={subcat.id || subcat._id}
                type="button"
                onClick={() => {
                  console.log("Clicked subcategory:", subcat.id || subcat._id);
                  setSelectedSubcategory(subcat.id || subcat._id);
                }}
                className={`w-full flex flex-col items-center justify-center py-3 relative transition-all duration-200 group ${
                  isSelected ? "bg-[#f0e6f7] rounded-r-2xl" : "hover:bg-neutral-50 px-1"
                }`}
                style={{
                  minHeight: "90px",
                }}>

                {/* Image Container */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl mb-1.5 flex-shrink-0 overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? ""
                      : "bg-neutral-50 group-hover:shadow-sm"
                  }`}>
                  {subcat.image ? (
                    <img
                      src={subcat.image}
                      alt={subcat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent =
                            subcat.icon || subcat.name?.charAt(0) || "📦";
                        }
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{subcat.icon || "📦"}</span>
                  )}
                </div>

                {/* Text Label */}
                <span
                  className={`text-[11px] text-center leading-tight px-1 transition-colors ${
                    isSelected
                      ? "font-black text-neutral-900"
                      : "text-neutral-500 font-medium group-hover:text-neutral-900"
                  }`}
                  style={{
                    wordBreak: "break-word",
                    maxWidth: "100%",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                  {subcat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Simplified Header with Breadcrumbs */}
        <div className="sticky top-0 z-40 bg-white border-b border-neutral-100 flex-shrink-0">
          <div className="px-5 py-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[13px] text-neutral-500 font-medium mb-2 overflow-x-auto scrollbar-hide whitespace-nowrap">
               <button onClick={() => navigate('/')} className="hover:text-neutral-900 transition-colors">Home</button>
               <span>›</span>
               <span className={`${id === 'lowest-prices' ? 'text-neutral-900 font-bold' : 'hover:text-neutral-900 transition-colors line-clamp-1'}`} onClick={() => id !== 'lowest-prices' && navigate(-1)}>{category?.name}</span>
               {id !== 'lowest-prices' && (
                 <>
                   <span>›</span>
                   <span className="text-neutral-900 font-bold">{subcategories.find(s => (s.id || s._id) === selectedSubcategory)?.name || 'All'}</span>
                 </>
               )}
            </div>

            {/* Bold Section Title */}
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              {subcategories.find(s => (s.id || s._id) === selectedSubcategory)?.name || 'All'}
            </h1>
          </div>
        </div>

        {/* Filter/Sort Bar - Consistent with Store Page UI */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth border-b border-neutral-100 flex-shrink-0">
            <button 
                onClick={() => setIsFiltersOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm text-[13px] font-bold active:scale-95 transition-all whitespace-nowrap ${
                    (activeFilters.categories.length + activeFilters.brands.length) > 0
                    ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                    : 'bg-white border-neutral-200 text-gray-700'
                }`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                </svg>
                Filter {(activeFilters.categories.length + activeFilters.brands.length) > 0 && `(${activeFilters.categories.length + activeFilters.brands.length})`}
                <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <button 
                onClick={() => setIsSortOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm text-[13px] font-bold active:scale-95 transition-all whitespace-nowrap ${
                    sortBy !== 'relevance'
                    ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                    : 'bg-white border-neutral-200 text-gray-700'
                }`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M3 12h18M12 3v18" strokeLinecap="round" />
                </svg>
                Sort {sortBy !== 'relevance' && '•'}
                <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Sub-category Quick Filters */}
            {subcategories
              .filter((subcat) => (subcat.id || subcat._id) !== "all")
              .map((subcat) => {
                const subId = subcat.id || subcat._id;
                const isSelected = selectedSubcategory === subId;
                return (
                  <button
                    key={subId}
                    onClick={() => setSelectedSubcategory(subId)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm text-[13px] font-bold active:scale-95 transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-neutral-900 border-neutral-900 text-white"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}>
                    <span>{subcat.name}</span>
                  </button>
                );
              })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
          {/* Products Grid */}
          {categoryProducts.length > 0 ? (
            <div className="px-3 md:px-6 lg:px-8 py-4 md:py-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2 gap-y-4">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product._id || (product as any).id}
                    product={product}
                    showHeartIcon={true}
                    showStockInfo={false}
                    showBadge={true}
                    showOptionsText={true}
                    categoryStyle={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <NoProductsFound />
            </div>
          )}
        </div>
      </div>

      {/* Filters Modal */}
      <AnimatePresence>
        {isFiltersOpen && (
          <>
            {/* Hide footer when modal is open */}
            <style>{`
              nav[class*="fixed bottom-0"] {
                display: none !important;
              }
            `}</style>
            <div className="fixed inset-0 z-[100]">
              {/* Backdrop - Semi-transparent overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsFiltersOpen(false)}
              />

              {/* Modal - Slides up from bottom, compact size matching image */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <h2 className="text-base font-bold text-neutral-900 uppercase tracking-tight">
                    Filters
                  </h2>
                  <button onClick={() => setIsFiltersOpen(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="px-5 py-3 border-b border-neutral-50 bg-neutral-50/50">
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search across filters..."
                      value={filterSearchQuery}
                      onChange={(e) => setFilterSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-[13px] text-neutral-700 placeholder:text-neutral-400 shadow-sm"
                    />
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-1 overflow-hidden min-h-0 bg-white">
                  {/* Left Column - Sidebar Style */}
                  <div className="w-28 border-r border-neutral-100 flex-shrink-0 bg-neutral-50/30">
                    {(["Categories", "Brands"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSelectedFilterCategory(tab)}
                        className={`w-full px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest relative transition-all ${
                          selectedFilterCategory === tab
                            ? "bg-white text-[#ff3269]"
                            : "text-neutral-400 hover:bg-neutral-50"
                        }`}>
                        {selectedFilterCategory === tab && (
                          <motion.div 
                            layoutId="activeFilterTab"
                            className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff3269]"
                          />
                        )}
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Right Column - Filter Options */}
                  <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="p-4 space-y-1">
                      {selectedFilterCategory === "Categories" ? (
                        subcategories
                          .filter(s => (s.id || s._id) !== "all")
                          .filter(s => s.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map((subcat) => {
                            const id = subcat.id || subcat._id;
                            const isChecked = selectedFilters.categories.includes(id);
                            return (
                              <button
                                key={id}
                                onClick={() => handleFilterToggle(id, "categories")}
                                className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 rounded-xl transition-all group">
                                <span className={`text-[13px] font-bold ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {subcat.name}
                                </span>
                                <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2 rounded-md border-2 transition-all ${
                                  isChecked ? 'bg-[#ff3269] border-[#ff3269]' : 'border-gray-200'
                                }`}>
                                  {isChecked && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                      <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })
                      ) : (
                        availableBrands
                          .filter(b => b.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map((brand) => {
                            const isChecked = selectedFilters.brands.includes(brand.id);
                            return (
                              <button
                                key={brand.id}
                                onClick={() => handleFilterToggle(brand.id, "brands")}
                                className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 rounded-xl transition-all group">
                                <span className={`text-[13px] font-bold ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {brand.name}
                                </span>
                                <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2 rounded-md border-2 transition-all ${
                                  isChecked ? 'bg-[#ff3269] border-[#ff3269]' : 'border-gray-200'
                                }`}>
                                  {isChecked && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                      <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })
                      )}
                      
                      {((selectedFilterCategory === "Categories" && subcategories.length <= 1) || 
                        (selectedFilterCategory === "Brands" && availableBrands.length === 0)) && (
                        <div className="py-20 text-center opacity-30">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No options found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 pb-24 border-t border-neutral-100 flex gap-3 bg-white/90 backdrop-blur-xl">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border border-neutral-100 rounded-xl bg-neutral-50/50"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-[2] py-3 bg-[#ff3269] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-pink-100/40 active:scale-95 transition-all"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <SortModal 
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        onSelect={(newSort) => setSortBy(newSort)}
        selectedOption={sortBy}
      />
    </div>
  );
}
