import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { categories: string[], brands: string[] }) => void;
  categories: { id: string, name: string }[];
  brands: { id: string, name: string }[];
  initialFilters: { categories: string[], brands: string[] };
}

export default function FilterModal({ 
  isOpen, 
  onClose, 
  onApply, 
  categories, 
  brands,
  initialFilters 
}: FilterModalProps) {
  const [activeTab, setActiveTab] = useState<'Categories' | 'Brands'>('Categories');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilters.categories || []);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialFilters.brands || []);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleClear = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
  };

  const handleApply = () => {
    onApply({ categories: selectedCategories, brands: selectedBrands });
    onClose();
  };

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
            className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Filters</h2>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 overflow-hidden min-h-[400px]">
              {/* Sidebar Tabs */}
              <div className="w-1/3 bg-gray-50 border-r border-gray-100 flex flex-col">
                {(['Categories', 'Brands'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-6 py-6 text-left text-sm font-black uppercase tracking-wider transition-all ${
                      activeTab === tab ? 'text-[#ff3269] bg-white' : 'text-gray-400'
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff3269] shadow-[2px_0_8px_rgba(255,50,105,0.3)]"
                      />
                    )}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Options List */}
              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === 'Categories' && (
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center justify-between py-3 cursor-pointer group">
                        <span className={`text-[15px] font-bold transition-colors ${
                          selectedCategories.includes(cat.id) ? 'text-gray-900 border-b-2 border-pink-100' : 'text-gray-500'
                        }`}>
                          {cat.name}
                        </span>
                        <div onClick={() => toggleCategory(cat.id)} className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                          selectedCategories.includes(cat.id) 
                          ? 'border-[#ff3269] bg-[#ff3269]' 
                          : 'border-gray-200 group-hover:border-gray-300'
                        }`}>
                          {selectedCategories.includes(cat.id) && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {activeTab === 'Brands' && (
                  <div className="space-y-2">
                    {brands.length > 0 ? brands.map(brand => (
                      <label key={brand.id} className="flex items-center justify-between py-3 cursor-pointer group">
                         <span className={`text-[15px] font-bold transition-colors ${
                          selectedBrands.includes(brand.id) ? 'text-gray-900 border-b-2 border-pink-100' : 'text-gray-500'
                        }`}>
                          {brand.name}
                        </span>
                        <div onClick={() => toggleBrand(brand.id)} className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                          selectedBrands.includes(brand.id) 
                          ? 'border-[#ff3269] bg-[#ff3269]' 
                          : 'border-gray-200 group-hover:border-gray-300'
                        }`}>
                          {selectedBrands.includes(brand.id) && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </label>
                    )) : (
                        <div className="py-20 text-center opacity-40 grayscale">
                            <p className="text-sm font-bold uppercase tracking-widest">No brands found</p>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 flex gap-4 bg-white">
              <button
                onClick={handleClear}
                className="flex-1 py-4 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors border border-gray-100 rounded-2xl"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-[2] py-4 bg-[#ff3269] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-pink-100 active:scale-[0.98] transition-all"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
