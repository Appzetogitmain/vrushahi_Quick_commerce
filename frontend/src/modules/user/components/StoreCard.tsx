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
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/store/${store.id}`)}
            className="group relative flex flex-col w-full h-[260px] bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(139,92,246,0.1)] border border-neutral-100 overflow-hidden cursor-pointer transition-all duration-300"
        >
            {/* Image Section - STRICT FIXED HEIGHT */}
            <div className="relative w-full h-[155px] overflow-hidden bg-neutral-50/50 flex-shrink-0">
                {store.logo ? (
                    <div className="w-full h-full p-4 flex items-center justify-center">
                        <img
                            src={store.logo}
                            alt={store.name}
                            className="max-w-full max-h-full w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                        <span className="text-5xl font-black text-white/95 drop-shadow-lg select-none">
                            {store.name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Delivery Badge - Ultra Modern Glassmorphism */}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 flex items-center gap-1.5 z-10 transition-transform duration-300 group-hover:scale-105">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-neutral-800 tracking-tight whitespace-nowrap">
                        {store.deliveryTime || '24 MINS'}
                    </span>
                </div>

                {/* Status Overlay */}
                {!store.isShopOpen && (
                    <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <div className="bg-white/95 text-neutral-900 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl border border-white/50">
                            Closed Now
                        </div>
                    </div>
                )}
            </div>

            {/* Info Section - FIXED HEIGHT to ensure alignment */}
            <div className="p-4 flex flex-col flex-1 justify-between h-[105px]">
                <div className="space-y-1">
                    <h3 className="font-extrabold text-neutral-900 text-[13px] line-clamp-1 uppercase tracking-tight group-hover:text-purple-600 transition-colors">
                        {store.name}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        {store.rating && (
                            <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/30">
                                <span className="text-amber-500 text-[10px]">★</span>
                                <span className="text-amber-700 text-[10px] font-black">{store.rating}</span>
                            </div>
                        )}
                        <span className="text-neutral-300">|</span>
                        <span className="text-[10px] font-bold text-neutral-400">
                             {store.distance !== undefined ? `${store.distance} km` : 'Order Now'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <span className="text-sky-500 text-[9px] font-black uppercase tracking-widest bg-sky-50/80 px-2 py-1 rounded-md border border-sky-100 flex-shrink-0">
                        Express
                    </span>
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter line-clamp-1">
                        Free Delivery
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
