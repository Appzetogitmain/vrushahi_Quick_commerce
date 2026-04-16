import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeHero from "./components/HomeHero";
import HomeBannerCarousel from "./components/HomeBannerCarousel";
import PromoStrip from "./components/PromoStrip";
import LowestPricesEver from "./components/LowestPricesEver";
import CategoryTileSection from "./components/CategoryTileSection";
import FeaturedThisWeek from "./components/FeaturedThisWeek";
import ProductCard from "./components/ProductCard";
import StoreCard from "./components/StoreCard";
import { getHomeContent } from "../../services/api/customerHomeService";
import { getHeaderCategoriesPublic } from "../../services/api/headerCategoryService";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import PageLoader from "../../components/PageLoader";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { activeCategory, setActiveCategory } = useThemeContext();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory; // mapping for existing code compatibility
  const setActiveTab = setActiveCategory;
  const contentRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();

  // Get user's first name for personalization
  const firstName = isAuthenticated && user?.name 
    ? user.name.split(' ')[0] 
    : 'Friend';

  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>({
    bestsellers: [],
    categories: [],
    homeSections: [], // Dynamic sections created by admin
    shops: [],
    nearbyStores: [],
    promoBanners: [],
    trending: [],
    cookingIdeas: [],
  });
  const [showAllStores, setShowAllStores] = useState(false);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        startRouteLoading();
        setLoading(true);
        setError(null);
        const response = await getHomeContent(
          activeTab,
          location?.latitude,
          location?.longitude,
        );
        if (response.success && response.data) {
          setHomeData(response.data);

          if (response.data.bestsellers) {
            setProducts(response.data.bestsellers);
          }
        } else {
          setError("Failed to load content. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch home content", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
        stopRouteLoading();
      }
    };

    fetchData();

    // Preload PromoStrip data for all header categories in the background
    // This ensures instant loading when users switch tabs
    const preloadHeaderCategories = async () => {
      try {
        // Wait a bit after initial load to not interfere with main content
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const headerCategories = await getHeaderCategoriesPublic(true);
        // Preload data for each header category (including 'all')
        const slugsToPreload = [
          "all",
          ...headerCategories.map((cat) => cat.slug),
        ];

        // Preload in batches to avoid overwhelming the network
        const batchSize = 2;
        for (let i = 0; i < slugsToPreload.length; i += batchSize) {
          const batch = slugsToPreload.slice(i, i + batchSize);
          await Promise.all(
            batch.map((slug) =>
              getHomeContent(
                slug,
                location?.latitude,
                location?.longitude,
                true,
                5 * 60 * 1000,
                true,
              ).catch((err) => {
                // Silently fail - this is just preloading
                console.debug(`Failed to preload data for ${slug}:`, err);
              }),
            ),
          );
          // Small delay between batches
          if (i + batchSize < slugsToPreload.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      } catch (error) {
        // Silently fail - preloading is optional
        console.debug("Failed to preload header categories:", error);
      }
    };

    preloadHeaderCategories();
  }, [location?.latitude, location?.longitude, activeTab]);

  const getFilteredProducts = (tabId: string) => {
    if (tabId === "all") {
      return products;
    }
    return products.filter(
      (p) =>
        p.categoryId === tabId ||
        (p.category && (p.category._id === tabId || p.category.slug === tabId)),
    );
  };

  const filteredProducts = useMemo(
    () => getFilteredProducts(activeTab),
    [activeTab, products],
  );

  if (loading && !products.length) {
    return <PageLoader />; // Let the global IconLoader handle the initial loading state
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors">
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20 md:pb-0" ref={contentRef}>
      {/* Hero Header with Gradient and Tabs */}
      <HomeHero activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Dynamic Banners Carousel */}
      {activeTab === "all" &&
        homeData.promoBanners &&
        homeData.promoBanners.length > 0 && (
          <HomeBannerCarousel banners={homeData.promoBanners} />
        )}

      {/* STORES NEAR YOU - Swiggy/Zomato Style */}
      {(homeData.nearbyStores && homeData.nearbyStores.length > 0) || activeTab !== "all" ? (
        <div className="mt-4 mb-2 md:mt-8 md:mb-4 px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-3xl font-extrabold text-neutral-900 tracking-tight capitalize">
              {activeTab === "all" ? "Stores Near You" : `${activeTab} Stores Near You`}
            </h2>
            <div 
              onClick={() => setShowAllStores(!showAllStores)}
              className="flex items-center gap-1 text-[#8b5cf6] font-bold text-sm cursor-pointer hover:underline"
            >
              <span>{showAllStores ? "Show Less" : "View All"}</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3"
                className={`transition-transform duration-200 ${showAllStores ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
          
          
          {homeData.nearbyStores && homeData.nearbyStores.length > 0 ? (
            <div className={`
              ${showAllStores 
                ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6' 
                : 'grid grid-flow-col auto-cols-[165px] md:auto-cols-fr md:grid-cols-4 gap-4 md:gap-6 pb-6 items-stretch overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth'}
            `}>
              {homeData.nearbyStores.map((store: any) => (
                <div key={store.id} className="h-full w-full">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-violet-50/30 rounded-[2rem] border-2 border-dashed border-violet-100/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🏪</div>
              <p className="text-neutral-500 font-bold">No {activeTab} stores found nearby</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-black">Switching tabs might help!</p>
            </div>
          )}
        </div>
      ) : null}

      {/* LOWEST PRICES EVER Section */}
      <LowestPricesEver
        activeTab={activeTab}
        products={homeData.lowestPrices}
      />

      <div
        ref={contentRef}
        className="bg-white -mt-2 pt-1 space-y-5 md:space-y-8 md:pt-4">
        {/* Filtered Products Section (from bestsellers) */}
        {activeTab !== "all" && filteredProducts.length > 0 && (
          <div data-products-section className="mt-6 mb-6 md:mt-8 md:mb-8">
            <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight capitalize">
              {activeTab === "grocery" ? "Grocery Items" : activeTab}
            </h2>
            <div className="px-4 md:px-6 lg:px-8">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryStyle={true}
                      showBadge={true}
                      showPackBadge={false}
                      showStockInfo={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16 text-neutral-500">
                  <p className="text-lg md:text-xl mb-2">No products found</p>
                  <p className="text-sm md:text-base">
                    Try selecting a different category
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Sections */}
        {(activeTab === "all" || (homeData.homeSections && homeData.homeSections.length > 0)) && (
          <>
            {/* Sections only for 'All' tab */}
            {activeTab === "all" && (
              <>
              </>
            )}

            {/* Dynamic Home Sections - Render sections created by admin (all tabs) */}
            {homeData.homeSections && homeData.homeSections.length > 0 && (
              <>
                {homeData.homeSections.map((section: any) => {
                  if (!section.data || section.data.length === 0) return null;

                  // Skip sections we are handling manually to avoid duplication
                  const sectionTitle = section.title?.toLowerCase().trim() || "";
                  if (
                    sectionTitle.includes("top category") || 
                    sectionTitle.includes("top categories") || 
                    sectionTitle.includes("bestseller") ||
                    sectionTitle.includes("bestsellers")
                  ) {
                    return null;
                  }

                  const columnCount = Number(section.columns) || 4;

                  if (
                    section.displayType === "products" &&
                    section.data &&
                    section.data.length > 0
                  ) {
                    const gridClass =
                      {
                        2: "grid-cols-2",
                        3: "grid-cols-3",
                        4: "grid-cols-4",
                        6: "grid-cols-6",
                        8: "grid-cols-8",
                      }[columnCount] || "grid-cols-4";

                    const isCompact = columnCount >= 4;
                    const gapClass = columnCount >= 4 ? "gap-2" : "gap-3 md:gap-4";

                    return (
                      <div key={section.id} className="mt-6 mb-6 md:mt-8 md:mb-8">
                        {section.title && (
                          <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight capitalize">
                            {section.title}
                          </h2>
                        )}
                        <div className="px-4 md:px-6 lg:px-8">
                          <div className={`grid ${gridClass} ${gapClass}`}>
                            {section.data.map((product: any) => (
                              <ProductCard
                                key={product.id || product._id}
                                product={product}
                                categoryStyle={true}
                                showBadge={true}
                                showPackBadge={false}
                                showStockInfo={false}
                                compact={isCompact}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <CategoryTileSection
                      key={section.id}
                      title={section.title}
                      tiles={section.data || []}
                      columns={columnCount as 2 | 3 | 4 | 6 | 8}
                      showProductCount={false}
                    />
                  );
                })}
              </>
            )}

            {/* Personalized Featured Section - Relocated above Shop by Store */}
            {activeTab === "all" && (
              <div className="mt-8">
                <CategoryTileSection
                  title={`${firstName}, still looking for these?`}
                  variant="featured"
                  size="small"
                  tiles={
                    homeData.bestsellers && homeData.bestsellers.length > 0
                      ? homeData.bestsellers.slice(0, 10).map((card: any) => ({
                        id: card.id,
                        categoryId: card.categoryId,
                        name: card.name || "Category",
                        image: card.image || (card.productImages && card.productImages[0]),
                      }))
                      : []
                    }
                  showProductCount={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
