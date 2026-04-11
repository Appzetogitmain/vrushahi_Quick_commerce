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
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/store/${store.id}`)}
            className="flex flex-col bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300"
        >
            {/* Logo/Image Container */}
            <div className="relative aspect-[4/3] bg-neutral-50 overflow-hidden">
                {store.logo ? (
                    <img
                        src={store.logo}
                        alt={store.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 text-3xl font-bold text-emerald-600">
                        {store.name.charAt(0)}
                    </div>
                )}

                {/* Status Overlay */}
                {!store.isShopOpen && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white/90 text-neutral-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Closed
                        </span>
                    </div>
                )}
                
                {/* 24 Mins Badge - Fixed Branding */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-white/20 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                    <span className="text-[10px] font-bold text-neutral-800">24 MINS</span>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="font-bold text-neutral-900 text-sm line-clamp-1 flex-1">
                        {store.name}
                    </h3>
                    {store.rating && (
                        <div className="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700">
                            <span>★</span>
                            <span>{store.rating}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                    {store.distance !== null && (
                        <span>{store.distance} km</span>
                    )}
                    {store.distance !== null && <span>•</span>}
                    <span className="text-emerald-600 font-bold uppercase tracking-tight">Express</span>
                </div>
            </div>
        </motion.div>
    );
}
