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
                        className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6"
                    >
                        <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-6 sm:hidden" />
                        
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                                <path d="M11 17l4-4-4-4m-7 4h11m1 4a9 9 0 110-18 9 9 0 010 18z" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-neutral-900 text-center mb-2">Replace cart items?</h3>
                        <p className="text-neutral-500 text-center text-sm leading-relaxed mb-8">
                            Your cart contains items from <span className="font-bold text-neutral-800">{existingStoreName}</span>. 
                            Clear cart to add items from <span className="font-bold text-emerald-600">{newStoreName}</span>?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onConfirm}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                            >
                                YES, CLEAR AND ADD
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold py-4 rounded-2xl transition-all active:scale-95"
                            >
                                NO, KEEP EXISTING
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
