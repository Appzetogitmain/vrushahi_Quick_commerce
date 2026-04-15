import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '../../types/domain';
import { useEffect, useState, useRef } from 'react';
import { getStoreDetails } from '../../services/api/customerStoreService';
import ProductCard from './components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function StorePage() {
    const { slug: sellerId } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [seller, setSeller] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!sellerId) return;
            try {
                setLoading(true);
                const response = await getStoreDetails(sellerId);
                if (response.success) {
                    setSeller(response.data.seller);
                    setProducts(response.data.allProducts || []);
                }
            } catch (error: any) {
                console.error('Failed to fetch store data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sellerId]);

    const filteredProducts = products.filter(p => 
        (p.name || p.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-pink-200 border-t-[#ff3269] rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading store...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-20">
            {/* Premium Top Navigation Bar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
            }`}>
                <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            scrolled ? 'bg-gray-100 text-gray-900' : 'bg-white/20 backdrop-blur-md text-white border border-white/30'
                        }`}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    
                    <div className={`flex-1 relative transition-all duration-300 ${scrolled ? 'scale-100' : 'scale-105 origin-left'}`}>
                        <input
                            type="text"
                            placeholder={`Search in ${seller?.storeName || 'Store'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full h-11 pl-11 pr-4 rounded-xl text-sm focus:outline-none transition-all border ${
                                scrolled 
                                ? 'bg-gray-100 border-transparent focus:bg-white focus:border-pink-200' 
                                : 'bg-white/90 backdrop-blur-md border-white/40 focus:bg-white'
                            }`}
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
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center p-1">
                        <img
                            src={seller?.logo || 'https://placehold.co/100'}
                            alt={seller?.storeName}
                            className="w-full h-full object-contain rounded-full"
                        />
                    </div>
                </div>

                {/* Star Rating Overlay */}
                <div className="absolute -bottom-6 right-6">
                    <div className="bg-white px-3 py-1.5 rounded-full shadow-md border border-gray-100 flex items-center gap-1.5">
                        <svg className="text-amber-400 fill-amber-400" width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-900">{seller?.rating || '5.0'}</span>
                        <span className="text-xs text-gray-400 font-medium">({seller?.reviewsCount || '1'})</span>
                    </div>
                </div>
            </div>

            {/* Store Info Section */}
            <div className="px-6 pt-14 pb-4 bg-white shadow-sm border-b border-gray-100">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                    {seller?.storeName || 'Store Name'}
                </h1>
                
                <div className="space-y-3">
                    <div className="flex items-start gap-2">
                        <svg className="text-gray-400 mt-0.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-[13px] leading-relaxed text-gray-500 font-medium">
                                {seller?.address || 'Shop No. 10, New Market Lane, Bhuj'}
                            </p>
                            <span className="inline-block mt-1 bg-violet-50 text-[#8b5cf6] px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-violet-100 uppercase tracking-wider">
                                0.0 km
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-500">
                        <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <p className="text-[13px] font-medium">
                            <span className="text-[#8b5cf6] font-bold uppercase tracking-tight mr-1">Open Now</span>
                            · Mon-Sat 10 AM to 8 PM
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters and Sort Bar */}
            <div className="sticky top-[60px] z-40 bg-neutral-50/80 backdrop-blur-md px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth shadow-sm">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm text-[13px] font-bold text-gray-700 active:scale-95 transition-all whitespace-nowrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                    </svg>
                    Filter
                    <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm text-[13px] font-bold text-gray-700 active:scale-95 transition-all whitespace-nowrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
                    </svg>
                    Sort
                    <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Product Grid Section */}
            <div className="px-3 py-4">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Best Sellers</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredProducts.length} Items</span>
                </div>

                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product._id || product.id}
                                product={product}
                                categoryStyle={true}
                                showBadge={true}
                                showHeartIcon={true}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mx-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <p className="text-gray-500 font-bold mb-1">No products matched</p>
                        <p className="text-gray-400 text-xs font-medium">Try searching for something else</p>
                    </div>
                )}
            </div>
        </div>
    );
}
