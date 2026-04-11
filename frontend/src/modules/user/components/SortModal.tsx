import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: string) => void;
  selectedOption: string;
}

const sortOptions = [
  { id: 'relevance', name: 'Relevance (default)' },
  { id: 'price_low', name: 'Price (low to high)' },
  { id: 'price_high', name: 'Price (high to low)' },
  { id: 'rating', name: 'Top Rated' },
  { id: 'newest', name: 'Newest Arrivals' },
];

export default function SortModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedOption 
}: SortModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[32px] overflow-hidden flex flex-col pt-2"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mt-2" />

            {/* Header */}
            <div className="px-6 pt-4 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sort by</h2>
            </div>

            {/* List */}
            <div className="p-4 space-y-1">
              {sortOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${
                    selectedOption === option.id ? 'bg-pink-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-[15px] font-bold ${
                    selectedOption === option.id ? 'text-[#ff3269]' : 'text-gray-700'
                  }`}>
                    {option.name}
                  </span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedOption === option.id ? 'border-[#ff3269]' : 'border-gray-200'
                  }`}>
                    {selectedOption === option.id && (
                      <motion.div 
                        layoutId="activeSort"
                        className="w-3 h-3 rounded-full bg-[#ff3269] shadow-[0_0_8px_rgba(255,50,105,0.4)]"
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Close Spacer */}
            <div className="h-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
