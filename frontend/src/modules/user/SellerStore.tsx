import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation as useAppLocation } from '../../hooks/useLocation';
import { getStoreDetails } from '../../services/api/customerStoreService';
import ProductCard from './components/ProductCard';
import PageLoader from '../../components/PageLoader';
import FilterModal from './components/FilterModal';
import SortModal from './components/SortModal';
import NoProductsFound from './components/NoProductsFound';

export default function SellerStore() {
    const { sellerId } = useParams<{ sellerId: string }>();
    const navigate = useNavigate();
    const { location } = useAppLocation();
    
    const [loading, setLoading] = useState(true);
    const [storeData, setStoreData] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [scrolled, setScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filter & Sort State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<{ categories: string[], brands: string[] }>({
        categories: [],
        brands: []
    });
    const [appliedSort, setAppliedSort] = useState('relevance');
    
    // Available Filter Options (Categories/Brands)
    const [initialCategories, setInitialCategories] = useState<{ id: string, name: string }[]>([]);
    const [initialBrands, setInitialBrands] = useState<{ id: string, name: string }[]>([]);

    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchStoreDetails = async () => {
            try {
                if (!sellerId) return;
                setLoading(true);
                
                const response = await getStoreDetails(sellerId, {
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    categories: appliedFilters.categories,
                    brands: appliedFilters.brands,
                    sort: appliedSort
                });
                
                if (response.success) {
                    setStoreData(response.data);
                    
                    // Set default active category if not set
                    if (response.data.categories.length > 0 && !activeCategory) {
                        setActiveCategory(response.data.categories[0].id);
                    }

                    // Store all available filter options on first load
                    if (initialCategories.length === 0) {
                        setInitialCategories(response.data.categories.map(c => ({ id: c.id, name: c.name })));
                        
                        // Extract unique brands from all products
                        const brandsMap: { [key: string]: string } = {};
                        response.data.allProducts.forEach(p => {
                            if (p.brand && p.brand._id) {
                                brandsMap[p.brand._id] = p.brand.name;
                            }
                        });
                        setInitialBrands(Object.entries(brandsMap).map(([id, name]) => ({ id, name })));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch store details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStoreDetails();
    }, [sellerId, location, appliedFilters, appliedSort]);

    const scrollToCategory = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = categoryRefs.current[categoryId];
        if (element) {
            const yOffset = -220; // Adjusted for sticky search + sticky filter bar
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (loading && !storeData) return <PageLoader />;
    if (!storeData) return <div className="p-10 text-center">Store not found</div>;

    const { seller, categories } = storeData;

    // Local search filtering (additive to backend filtering)
    const filteredCategories = categories.map((cat: any) => ({
        ...cat,
        products: cat.products.filter((p: any) => 
            (p.productName || p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter((cat: any) => cat.products.length > 0);

    return (
        <div className="min-h-screen bg-neutral-50 pb-20 pt-[72px] md:pt-[100px] transition-all duration-300">
            {/* Premium Top Navigation Bar - Responsive */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${
                scrolled ? 'shadow-md py-2 md:py-4' : 'border-b border-gray-100 py-3 md:py-6'
            }`}>
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-4 md:gap-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    
                    <div className="flex-1 relative max-w-2xl">
                        <input
                            type="text"
                            placeholder={`Search in ${seller?.storeName || 'Store'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 md:h-14 pl-11 pr-4 rounded-xl md:rounded-2xl text-sm md:text-base focus:outline-none transition-all border bg-gray-50 border-gray-200 focus:bg-white focus:border-pink-200 shadow-sm"
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </nav>

            {/* Store Banner & Logo Section - Responsive */}
            <div className="relative max-w-7xl mx-auto md:px-4 md:mt-4">
                <div className="w-full aspect-[2.2/1] md:aspect-[3/1] bg-gray-200 overflow-hidden md:rounded-[2rem] shadow-lg">
                    <img
                        src={seller?.storeBanner || seller?.banner || '/assets/default-store-banner.png'}
                        alt="Store Banner"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                </div>
                
                {/* Overlapping Logo - Larger on desktop */}
                <div className="absolute -bottom-10 md:-bottom-16 left-6 md:left-12">
                    <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 md:border-8 border-white bg-white shadow-2xl overflow-hidden flex items-center justify-center p-1 md:p-2">
                        {seller.logo ? (
                            <img
                                src={seller.logo}
                                alt={seller.storeName}
                                className="w-full h-full object-contain rounded-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl md:text-6xl font-black text-gray-300 capitalize bg-neutral-50 rounded-full">
                                {seller.storeName.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rating Overlay Pill - Larger on desktop */}
                <div className="absolute -bottom-5 md:-bottom-8 right-6 md:right-12">
                    <div className="bg-white/95 backdrop-blur-md px-4 py-2 md:px-8 md:py-4 rounded-2xl md:rounded-3xl shadow-xl border border-white/50 flex items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-1.5 md:gap-2 text-[#ffb800]">
                            <svg className="fill-current w-5 h-5 md:w-8 md:h-8" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-base md:text-2xl font-black text-neutral-900">{seller.rating || '4.2'}</span>
                        </div>
                        <div className="w-px h-4 md:h-8 bg-gray-200" />
                        <span className="text-[10px] md:text-xs text-gray-400 font-black uppercase tracking-[0.2em]">{seller.reviewsCount || '100+'} REVIEWS</span>
                    </div>
                </div>
            </div>

            {/* Compact Store Info Section - Improved for Desktop */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-8 transition-all">
                <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 md:mb-12">
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-5xl font-black text-neutral-900 tracking-tight mb-3">
                                {seller.storeName}
                            </h1>
                            <p className="text-sm md:text-lg text-neutral-500 font-medium italic border-l-4 border-pink-200 pl-4 max-w-2xl">
                                "{seller.storeDescription || 'Premium quality, delivered instantly.'}"
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        {/* Location & Distance */}
                        <div className="flex items-center gap-4 bg-neutral-50 px-5 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-3xl border border-neutral-100 hover:border-pink-100 transition-colors group">
                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white flex items-center justify-center text-neutral-400 shadow-sm group-hover:text-pink-500 transition-colors">
                                <svg className="w-5 h-5 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-lg font-bold text-neutral-700 truncate mb-1">
                                    {seller.address || 'Location Details'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-wider">0.0 KM Nearby</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                                    <span className="text-[10px] md:text-xs font-black text-sky-600 uppercase tracking-wider">{seller.deliveryTime || '24 MINS'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="flex items-center gap-4 bg-pink-50/50 px-5 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-3xl border border-pink-100/50 hover:bg-pink-50 transition-colors group">
                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white flex items-center justify-center text-[#ff3269] shadow-sm">
                                <svg className="w-5 h-5 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-sm md:text-xl font-black text-neutral-800">
                                        {seller.workingHours?.open || '09:00 AM'} — {seller.workingHours?.close || '09:00 PM'}
                                    </span>
                                    <span className={`text-[10px] md:text-xs font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                                        seller.isShopOpen !== false ? 'bg-emerald-500 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm'
                                    }`}>
                                        {seller.isShopOpen !== false ? 'Open' : 'Closed'}
                                    </span>
                                </div>
                                <p className="text-[10px] md:text-xs text-pink-400 font-bold uppercase tracking-widest truncate">
                                    {seller.workingHours?.workingDays?.length > 0 
                                        ? seller.workingHours.workingDays.join(', ') 
                                        : 'Operational all week'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Sort Bar - Responsive */}
            <div className="sticky top-[72px] md:top-[100px] z-40 bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100 transition-all">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                    <button 
                        onClick={() => setIsFilterOpen(true)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl border shadow-sm text-sm md:text-base font-bold active:scale-95 transition-all whitespace-nowrap ${
                            appliedFilters.categories.length > 0 || appliedFilters.brands.length > 0
                            ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-pink-200'
                        }`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                        </svg>
                        Filter {(appliedFilters.categories.length + appliedFilters.brands.length) > 0 && `(${(appliedFilters.categories.length + appliedFilters.brands.length)})`}
                        <svg className="text-gray-400 ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setIsSortOpen(true)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl border shadow-sm text-sm md:text-base font-bold active:scale-95 transition-all whitespace-nowrap ${
                            appliedSort !== 'relevance'
                            ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-pink-200'
                        }`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M3 12h18M12 3v18" strokeLinecap="round" />
                        </svg>
                        Sort {appliedSort !== 'relevance' && `• ${appliedSort.charAt(0).toUpperCase() + appliedSort.slice(1)}`}
                        <svg className="text-gray-400 ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Menu Sections - Expand the grid on desktop */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-pink-100 border-t-[#ff3269] rounded-full animate-spin" />
                    </div>
                ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((cat: any) => (
                        <div 
                            key={cat.id} 
                            id={cat.id}
                            ref={(el) => (categoryRefs.current[cat.id] = el)}
                            className="mb-16 md:mb-24"
                        >
                            <div className="flex items-center justify-between mb-8 md:mb-12 px-1">
                                <h2 className="text-xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4">
                                    {cat.name}
                                    <div className="h-1.5 md:h-2 w-12 md:w-24 bg-pink-100 rounded-full" />
                                </h2>
                                <span className="text-[10px] md:text-sm font-black text-gray-400 bg-gray-100 px-3 py-1.5 md:px-5 md:py-2 rounded-full uppercase tracking-widest">
                                    {cat.products.length} {cat.products.length === 1 ? 'Item' : 'Items'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-8">
                                {cat.products.map((product: any) => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product} 
                                        categoryStyle={true}
                                        showBadge={true}
                                        showHeartIcon={true}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <NoProductsFound />
                )}
            </div>

            {/* Modals */}
            <FilterModal 
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={(newFilters) => setAppliedFilters(newFilters)}
                categories={initialCategories}
                brands={initialBrands}
                initialFilters={appliedFilters}
            />
            <SortModal 
                isOpen={isSortOpen}
                onClose={() => setIsSortOpen(false)}
                onSelect={(newSort) => setAppliedSort(newSort)}
                selectedOption={appliedSort}
            />
            

        </div>
    );
}
