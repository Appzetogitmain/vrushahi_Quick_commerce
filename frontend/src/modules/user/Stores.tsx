import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getHomeContent } from "../../services/api/customerHomeService";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import DetailedStoreCard from "./components/DetailedStoreCard";
import { motion, AnimatePresence } from "framer-motion";

export default function Stores() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      try {
        startRouteLoading();
        setLoading(true);
        setError(null);
        
        const response = await getHomeContent(
          "all",
          location?.latitude,
          location?.longitude
        );

        if (response.success && response.data) {
          setStores(response.data.nearbyStores || []);
        } else {
          setError("Failed to load stores. Please try again.");
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
        stopRouteLoading();
      }
    };

    fetchStores();
  }, [location?.latitude, location?.longitude]);

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    return stores.filter((store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stores, searchQuery]);

  return (
    <div className="bg-[#f2f4f7] min-h-screen pb-safe-bottom">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-6 sticky top-0 z-30 shadow-sm md:static md:shadow-none transition-all duration-300">
        <div className="max-w-7xl mx-auto md:pt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-12">
            <div className="flex items-center gap-4">
               <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors md:hidden"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tighter whitespace-nowrap">
                Nearby Stores
              </h1>
            </div>
            
            {/* Search Bar - Much longer for professional look */}
            <div className="relative group w-full md:flex-1 md:max-w-3xl lg:max-w-4xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for store"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 pl-12 text-sm md:text-base font-bold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-[#ff4d6d]/10 focus:border-[#ff4d6d] focus:bg-white transition-all shadow-sm group-hover:shadow-md h-12 md:h-14"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#ff4d6d] transition-colors"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store List - Grid on Desktop */}
      <div className="px-4 py-8 md:py-12 max-w-7xl mx-auto">
        {loading && stores.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-[32px] p-4 border border-neutral-100 h-64">
                <div className="h-32 bg-neutral-100 rounded-2xl mb-6"></div>
                <div className="flex gap-4">
                   <div className="w-16 h-16 bg-neutral-100 rounded-full flex-shrink-0 -mt-12 border-[3px] border-white shadow-sm ml-2"></div>
                   <div className="flex-1 space-y-3 pt-2">
                      <div className="h-5 bg-neutral-100 rounded-full w-3/4"></div>
                      <div className="h-3 bg-neutral-100 rounded-full w-1/2"></div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl p-10 shadow-sm border border-neutral-100 max-w-2xl mx-auto">
            <div className="text-5xl mb-6">😿</div>
            <h3 className="text-2xl font-black text-neutral-900 mb-3">Something went wrong</h3>
            <p className="text-neutral-500 mb-10 max-w-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-10 py-4 bg-[#ff4d6d] text-white rounded-full font-black shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                {filteredStores.map((store) => (
                  <motion.div
                    key={store.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <DetailedStoreCard store={store} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
            
            {/* Subtle Footer for stores */}
            <div className="pt-12 pb-16 text-center">
               <div className="w-16 h-1 bg-neutral-300 mx-auto rounded-full mb-6"></div>
               <p className="text-neutral-400 text-[11px] md:text-sm font-black uppercase tracking-[0.25em]">
                  End of nearby stores
               </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[48px] px-10 shadow-xl border border-neutral-100 max-w-2xl mx-auto transition-all duration-300">
             <div className="w-28 h-28 bg-neutral-100 rounded-full flex items-center justify-center mb-8 text-6xl shadow-inner">
               🛸
             </div>
            <h3 className="text-3xl font-black text-neutral-900 mb-4">Discovery Empty</h3>
            <p className="text-neutral-500 md:text-lg max-w-sm mx-auto mb-12 leading-relaxed font-medium">
              {searchQuery 
                ? `We couldn't find any stores matching "${searchQuery}" near your current location.`
                : "It looks like there are no active stores delivering to your area right now."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#ff4d6d] font-black md:text-sm uppercase text-xs tracking-[0.2em] hover:text-[#ff758c] py-4 px-10 bg-[#ff4d6d]/5 rounded-2xl transition-all border border-transparent hover:border-[#ff4d6d]/20"
              >
                Browse All Stores
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
