import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation as useAppLocation } from '../../hooks/useLocation';
import { getStoreDetails } from '../../services/api/customerStoreService';
import ProductCard from './components/ProductCard';
import PageLoader from '../../components/PageLoader';
import FilterModal from './components/FilterModal';
import SortModal from './components/SortModal';

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
        <div className="min-h-screen bg-neutral-50 pb-20 pt-[72px]">
            {/* Premium Top Navigation Bar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${
                scrolled ? 'shadow-md py-2' : 'border-b border-gray-100 py-3'
            }`}>
                <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gray-100 text-gray-900 border border-gray-200"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder={`Search in ${seller?.storeName || 'Store'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm focus:outline-none transition-all border bg-gray-50 border-gray-200 focus:bg-white focus:border-pink-200"
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </nav>

            {/* Store Banner & Logo Section */}
            <div className="relative">
                <div className="w-full aspect-[2.2/1] bg-gray-200 overflow-hidden">
                    <img
                        src={seller?.storeBanner || seller?.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200'}
                        alt="Store Banner"
                        className="w-full h-full object-cover"
                    />
                </div>
                
                {/* Overlapping Logo */}
                <div className="absolute -bottom-10 left-6">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center p-1">
                        {seller.logo ? (
                            <img
                                src={seller.logo}
                                alt={seller.storeName}
                                className="w-full h-full object-contain rounded-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-300 capitalize bg-neutral-50">
                                {seller.storeName.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rating Overlay Pill */}
                <div className="absolute -bottom-6 right-6">
                    <div className="bg-white px-3.5 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[#ffb800]">
                            <svg className="fill-current" width="16" height="16" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm font-black text-gray-900">{seller.rating || '4.2'}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{seller.reviewsCount || '100+'} REVIEWS</span>
                    </div>
                </div>
            </div>

            {/* Store Detailed Info */}
            <div className="px-6 pt-14 pb-6 bg-white shadow-sm border-b border-gray-100">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2 uppercase">
                    {seller.storeName}
                </h1>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] leading-relaxed text-gray-500 font-bold max-w-sm">
                                {seller.address || 'Standard Quality Location, Bhuj'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
                                    0.0 KM
                                </span>
                                <span className="bg-sky-50 text-sky-600 px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-sky-100 uppercase tracking-widest">
                                    {seller.deliveryTime || '24 MINS'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400 font-medium leading-relaxed italic border-l-2 border-pink-100 pl-3">
                        "{seller.storeDescription || 'Your premium choice for quality products delivered instantly.'}"
                    </p>
                </div>
            </div>

            {/* Filters and Sort Bar */}
            <div className="sticky top-[60px] z-40 bg-white/80 backdrop-blur-md px-4 py-3.5 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth shadow-sm border-b border-gray-100">
                <button 
                    onClick={() => setIsFilterOpen(true)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm text-[13px] font-bold active:scale-95 transition-all whitespace-nowrap ${
                        appliedFilters.categories.length > 0 || appliedFilters.brands.length > 0
                        ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                    </svg>
                    Filter {(appliedFilters.categories.length + appliedFilters.brands.length) > 0 && `(${(appliedFilters.categories.length + appliedFilters.brands.length)})`}
                    <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button 
                    onClick={() => setIsSortOpen(true)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm text-[13px] font-bold active:scale-95 transition-all whitespace-nowrap ${
                        appliedSort !== 'relevance'
                        ? 'bg-pink-50 border-[#ff3269] text-[#ff3269]'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M3 12h18M12 3v18" strokeLinecap="round" />
                    </svg>
                    Sort {appliedSort !== 'relevance' && '•'}
                    <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Menu Sections */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-12 h-12 border-4 border-pink-100 border-t-[#ff3269] rounded-full animate-spin" />
                    </div>
                ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((cat: any) => (
                        <div 
                            key={cat.id} 
                            id={cat.id}
                            ref={(el) => (categoryRefs.current[cat.id] = el)}
                            className="mb-12"
                        >
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                                    {cat.name}
                                    <div className="h-1 w-8 bg-pink-100 rounded-full" />
                                </h2>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                    {cat.products.length} {cat.products.length === 1 ? 'Item' : 'Items'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200 mx-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2">No matching products</h3>
                        <p className="text-gray-400 text-sm font-medium">Try refining your filters or search</p>
                    </div>
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
