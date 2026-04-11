import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface DetailedStoreCardProps {
    store: {
        id: string;
        name: string;
        logo?: string;
        banner?: string;
        address?: string;
        rating?: number | string;
        reviewsCount?: number;
        distance?: number;
        isShopOpen: boolean;
        deliveryTime: string;
    };
}

export default function DetailedStoreCard({ store }: DetailedStoreCardProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/store/${store.id}`)}
            className="flex flex-col bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-500 group"
        >
            {/* Banner Section */}
            <div className="relative h-48 md:h-56 bg-neutral-100 overflow-hidden">
                {store.banner ? (
                    <img
                        src={store.banner}
                        alt={`${store.name} banner`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                        <span className="text-4xl filter grayscale opacity-50">🏪</span>
                    </div>
                )}
                
                {/* Overlay for status */}
                {!store.isShopOpen && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <span className="bg-white/90 text-neutral-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                            Closed
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Info Section with overlapping logo */}
            <div className="relative px-5 pt-12 pb-6">
                {/* Overlapping Logo */}
                <div className="absolute -top-12 left-5 w-24 h-24 rounded-full border-4 border-white shadow-xl bg-white overflow-hidden z-20 transition-transform duration-500 group-hover:scale-105">
                    {store.logo ? (
                        <img
                            src={store.logo}
                            alt={store.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff4d6d] to-[#ff758c] text-3xl font-black text-white">
                            {store.name.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Rating Badge - Top Right of card content */}
                <div className="absolute top-4 right-5 flex items-center gap-1 bg-yellow-400/10 px-3 py-1.5 rounded-2xl border border-yellow-400/20">
                    <span className="text-yellow-600 font-bold">★</span>
                    <span className="text-xs font-black text-neutral-800 tracking-tight">
                        {store.rating}/5 ({store.reviewsCount || 0})
                    </span>
                </div>

                {/* Info */}
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-neutral-900 leading-tight group-hover:text-[#ff4d6d] transition-colors line-clamp-1">
                        {store.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-neutral-500 font-medium text-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
                            <path d="M12 21s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" />
                            <circle cx="12" cy="8" r="3" />
                        </svg>
                        <span className="line-clamp-1">{store.address || 'Locality information unavailable'}</span>
                    </div>
                </div>

                {/* Distance Badge */}
                <div className="mt-5 flex items-center justify-between">
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter">
                            {store.distance !== null ? `${store.distance} km` : 'Near you'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 bg-neutral-50 px-2 py-1.5 rounded-lg border border-neutral-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                        <span>{store.deliveryTime}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
