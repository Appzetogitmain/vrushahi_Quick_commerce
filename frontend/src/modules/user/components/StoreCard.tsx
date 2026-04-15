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
            <div className="p-3 bg-white">
                <div className="flex flex-col gap-0.5 mb-2">
                    <h3 className="font-black text-neutral-900 text-xs md:text-sm line-clamp-1 uppercase tracking-tight group-hover:text-violet-600 transition-colors">
                        {store.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {store.rating && (
                            <div className="flex items-center gap-0.5 bg-[#FFF9E6] px-1.5 py-0.5 rounded-md border border-[#FFE7A3]/30">
                                <span className="text-[#FABC05] text-[10px]">★</span>
                                <span className="text-[#9E7700] text-[10px] font-black">{store.rating}</span>
                            </div>
                        )}
                        <span className="text-neutral-300">|</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                             {store.distance !== undefined ? `${store.distance} km` : 'Order Now'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[#38BDF8] text-[9px] font-black uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 flex-shrink-0">
                        Express
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter line-clamp-1">
                        Free Delivery
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
