import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface StoreCardProps {
    store: {
        id: string;
        name: string;
        logo?: string;
        rating?: number | string;
        reviewsCount?: number;
        distance?: number;
        isShopOpen: boolean;
        deliveryTime: string;
    };
}

export default function StoreCard({ store }: StoreCardProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ y: -6, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/store/${store.id}`)}
            className="group flex flex-col bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-neutral-100/50 overflow-hidden cursor-pointer transition-all duration-500"
        >
            {/* Logo/Image Container with Gradient Overlay */}
            <div className="relative aspect-[1/1] overflow-hidden">
                {store.logo ? (
                    <div className="w-full h-full p-3 bg-neutral-50/50 flex items-center justify-center">
                        <img
                            src={store.logo}
                            alt={store.name}
                            className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E0C3FC] to-[#8EC5FC] text-4xl font-black text-white/90 tracking-tighter shadow-inner">
                        {store.name.charAt(0)}
                    </div>
                )}

                {/* Status Overlay - Smarter Design */}
                {!store.isShopOpen && (
                    <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[3px] flex items-center justify-center z-20">
                        <span className="bg-white text-neutral-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-xl border border-white/50">
                            Closed Now
                        </span>
                    </div>
                )}
                
                {/* Delivery Time Badge - Premium Glassmorphism */}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 flex items-center gap-1.5 z-10 transition-transform duration-300 group-hover:scale-105">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black text-neutral-800 tracking-tight">{store.deliveryTime || '24 MINS'}</span>
                </div>
            </div>

            {/* Info Section - Professional Typography */}
            <div className="p-4 bg-white">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-black text-neutral-900 text-sm line-clamp-1 flex-1 uppercase tracking-tight group-hover:text-sky-600 transition-colors">
                        {store.name}
                    </h3>
                    {store.rating && (
                        <div className="flex items-center gap-1 bg-[#FFF9E6] px-2 py-0.5 rounded-lg border border-[#FFE7A3]/50">
                            <span className="text-[#FABC05] text-[10px]">★</span>
                            <span className="text-[#9E7700] text-[11px] font-black">{store.rating}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        </svg>
                        {store.distance !== null ? `${store.distance} km` : 'Near You'}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-neutral-200" />
                    <span className="text-[#38BDF8] text-[10px] font-black uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                        Express
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
