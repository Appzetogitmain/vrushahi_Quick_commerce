import { motion, AnimatePresence } from 'framer-motion';

interface StoreMismatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    existingStoreName?: string;
    newStoreName?: string;
}

export default function StoreMismatchModal({
    isOpen,
    onClose,
    onConfirm,
    existingStoreName = 'another store',
    newStoreName = 'this store'
}: StoreMismatchModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-white w-full max-w-sm rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden p-8 border border-neutral-100"
                    >
                        {/* Pull handle for mobile */}
                        <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-10 sm:hidden opacity-50" />
                        
                        {/* Icon Container */}
                        <div className="relative mb-8 flex justify-center">
                            <div className="w-24 h-24 bg-pink-50 rounded-[32px] flex items-center justify-center rotate-3 relative z-10">
                                <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-sm -rotate-3">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                </div>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute top-0 right-1/4 w-4 h-4 bg-pink-200 rounded-full blur-sm animate-pulse" />
                        </div>

                        <h3 className="text-2xl font-bold text-neutral-900 text-center mb-3 tracking-tight">Replace cart items?</h3>
                        <p className="text-neutral-500 text-center text-sm leading-relaxed mb-10 px-4">
                            Your cart already has items from <span className="font-semibold text-neutral-800">{existingStoreName}</span>. 
                            Would you like to clear it and add items from <span className="font-semibold text-[#ff4d6d]">{newStoreName}</span>?
                        </p>

                        <div className="flex flex-col gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: '#fff5f7' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onConfirm}
                                className="w-full bg-white border-2 border-[#ff4d6d] text-[#ff4d6d] font-bold py-4 rounded-[20px] transition-all shadow-md active:shadow-sm text-base"
                            >
                                Clear and add items
                            </motion.button>
                            <button
                                onClick={onClose}
                                className="w-full bg-transparent hover:bg-neutral-50 text-neutral-400 font-medium py-3 rounded-[20px] transition-all text-sm"
                            >
                                No, keep existing
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
