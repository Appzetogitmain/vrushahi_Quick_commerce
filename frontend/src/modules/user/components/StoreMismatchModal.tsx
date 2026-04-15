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
                        className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8"
                    >
                        <div className="w-12 h-1.5 bg-neutral-100 rounded-full mx-auto mb-8 sm:hidden" />
                        
                        <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-sm shadow-violet-100">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
                                <path d="M11 17l4-4-4-4m-7 4h11m1 4a9 9 0 110-18 9 9 0 010 18z" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-black text-neutral-900 text-center mb-3">Replace cart items?</h3>
                        <p className="text-neutral-500 text-center text-[15px] leading-relaxed mb-10 px-2">
                            Your cart contains items from <span className="font-bold text-neutral-800">{existingStoreName}</span>. 
                            Clear cart to add items from <span className="font-bold text-[#8b5cf6]">{newStoreName}</span>?
                        </p>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={onConfirm}
                                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-violet-200 active:scale-[0.98] text-lg"
                            >
                                YES, CLEAR AND ADD
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-500 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
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
