import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './components/ProductCard';
import StoreCard from './components/StoreCard';
import { getHomeContent, getGlobalSearch } from '../../services/api/customerHomeService';
import { Product } from '../../types/domain';
import { useLocation } from '../../hooks/useLocation';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { location } = useLocation();
  const searchQuery = searchParams.get('q') || '';
  
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [searchResults, setSearchResults] = useState<{ products: Product[], stores: any[] }>({
    products: [],
    stores: []
  });
  
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [cookingIdeas, setCookingIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Update URL and trigger search when input changes (with debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchParams(searchInput ? { q: searchInput } : {}, { replace: true });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, setSearchParams, searchQuery]);

  // Fetch products and stores based on search query
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ products: [], stores: [] });
        return;
      }

      setLoading(true);
      try {
        const response = await getGlobalSearch(
          searchQuery,
          location?.latitude,
          location?.longitude
        );
        
        if (response.success && response.data) {
          setSearchResults({
            products: response.data.products || [],
            stores: response.data.stores || []
          });
        }
      } catch (error) {
        console.error('Error in global search:', error);
        setSearchResults({ products: [], stores: [] });
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchQuery, location]);

  // Fetch trending/home content for initial view
  useEffect(() => {
    const fetchInitialContent = async () => {
      try {
        const response = await getHomeContent(
          undefined,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          setTrendingItems(response.data.trending || []);
          setCookingIdeas(response.data.cookingIdeas || []);
        }
      } catch (error) {
        console.error("Error fetching search initial content", error);
      } finally {
        setContentLoading(false);
      }
    };

    if (!searchQuery.trim()) {
      fetchInitialContent();
    }
  }, [searchQuery, location?.latitude, location?.longitude]);

  return (
    <div className="pb-24 md:pb-8 bg-[#F8F9FA] min-h-screen">
      {/* Premium Search Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 px-4 py-3 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-purple-600 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for products or stores..."
              className="w-full pl-12 pr-12 py-3 bg-neutral-100 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all text-[16px] font-medium placeholder:text-neutral-400 outline-none"
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {searchQuery.trim() ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 md:px-8 py-6"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-neutral-500 font-medium animate-pulse">Searching for "{searchQuery}"...</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Stores Results Section */}
                  {searchResults.stores.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Stores Found</h2>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase">
                          {searchResults.stores.length} Results
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {searchResults.stores.map((store) => (
                          <StoreCard key={store.id} store={store} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Products Results Section */}
                  {searchResults.products.length > 0 ? (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Product Results</h2>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase">
                          {searchResults.products.length} Results
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                        {searchResults.products.map((product) => (
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
                    </section>
                  ) : (
                    !searchResults.stores.length && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-2">No results found for "{searchQuery}"</h3>
                        <p className="text-neutral-500 max-w-xs">Try checking your spelling or use more general terms.</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 md:px-8 py-6"
            >
              {/* Trending in your city */}
              {contentLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-neutral-100 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <>
                  {trendingItems.length > 0 && (
                    <div className="mb-10">
                      <h2 className="text-xl font-black text-neutral-900 mb-6 uppercase tracking-tight">Trending in your city</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {trendingItems.map((item, idx) => (
                          <motion.div
                            key={item.id || item._id}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-3xl p-4 shadow-sm border border-neutral-100 cursor-pointer flex flex-col items-center text-center group"
                            onClick={() => navigate(item.type === 'category' ? `/category/${item.id || item._id}` : `/product/${item.id || item._id}`)}
                          >
                            <div className="w-full aspect-square rounded-2xl mb-3 overflow-hidden bg-neutral-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                              {item.image || item.imageUrl ? (
                                <img
                                  src={item.image || item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-contain p-2 transform group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="text-4xl">🔥</div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-neutral-800 line-clamp-2 uppercase tracking-tight">
                              {item.name || item.title}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Browse categories quick link */}
                  <button 
                    onClick={() => navigate('/categories')}
                    className="w-full py-4 px-6 bg-white border border-neutral-200 rounded-2xl flex items-center justify-between group hover:border-purple-300 transition-colors mb-10"
                  >
                    <span className="text-lg font-bold text-neutral-800 uppercase tracking-tight">Browse all categories</span>
                    <div className="w-10 h-10 bg-neutral-50 rounded-full flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>

                  {/* Cooking ideas */}
                  {cookingIdeas.length > 0 && (
                    <div>
                      <h2 className="text-xl font-black text-neutral-900 mb-6 uppercase tracking-tight">Cooking ideas</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cookingIdeas.map((idea, idx) => (
                          <motion.div 
                            key={idea.id || idea._id || idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="group relative rounded-3xl overflow-hidden aspect-[4/3] bg-neutral-100 cursor-pointer shadow-sm shadow-purple-900/5" 
                            onClick={() => navigate(`/product/${idea.productId || idea.id}`)}
                          >
                            {idea.image && <img src={idea.image} alt={idea.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              <p className="text-xs font-black uppercase tracking-[0.2em] mb-1 text-white/60">Recipe Pick</p>
                              <h3 className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2">{idea.title}</h3>
                            </div>
                            <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                              </svg>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
