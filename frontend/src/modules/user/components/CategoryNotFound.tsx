import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface CategoryNotFoundProps {
  slug?: string;
  onExploreAll?: () => void;
}

const CategoryNotFound: React.FC<CategoryNotFoundProps> = ({ slug, onExploreAll }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center bg-white">
      {/* Animated Avatar / Illustration Container */}
      <div className="relative w-64 h-64 mb-8">
        {/* Background Circles */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 bg-purple-50 rounded-full"
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 0.3 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", delay: 0.2 }}
          className="absolute inset-0 border-2 border-purple-100 rounded-full"
        />

        {/* The "Searching" Avatar (SVG based animation) */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: 0 }}
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Friendly Avatar Head */}
            <circle cx="100" cy="90" r="50" fill="#9333ea" fillOpacity="0.1" stroke="#9333ea" strokeWidth="4" />
            <circle cx="80" cy="85" r="4" fill="#9333ea" />
            <circle cx="120" cy="85" r="4" fill="#9333ea" />
            
            {/* Magnifying Glass */}
            <motion.g
              animate={{ 
                rotate: [0, 15, -15, 0],
                x: [0, 10, -10, 0],
                y: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <circle cx="130" cy="110" r="25" stroke="#9333ea" strokeWidth="4" fill="white" />
              <line x1="148" y1="128" x2="170" y2="150" stroke="#9333ea" strokeWidth="6" strokeLinecap="round" />
              {/* Question mark inside glass */}
              <text x="122" y="118" fontSize="24" fontWeight="bold" fill="#9333ea" fontFamily="Arial">?</text>
            </motion.g>

            {/* Floating dots */}
            <motion.circle cx="40" cy="60" r="3" fill="#9333ea" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
            <motion.circle cx="160" cy="70" r="4" fill="#9333ea" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
          </svg>
        </motion.div>
      </div>

      {/* Text Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-black text-neutral-900 mb-3 tracking-tight">
          Category not found
        </h2>
        <p className="text-neutral-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">
          We couldn't find the <span className="text-purple-600 font-bold">"{slug || 'requested'}"</span> category. 
          It might have moved or is taking a short break!
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-3.5 bg-neutral-100 text-neutral-900 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-95 border border-transparent"
          >
            Go Back
          </button>
          <button
            onClick={() => onExploreAll ? onExploreAll() : navigate('/categories')}
            className="w-full sm:w-auto px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-95"
          >
            Explore All Categories
          </button>
        </div>
      </motion.div>

      {/* Suggested Categories / Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 p-4 bg-purple-50 rounded-2xl inline-flex items-center gap-2"
      >
        <span className="text-lg">💡</span>
        <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">
          Try searching for fresh fruits or snacks instead
        </p>
      </motion.div>
    </div>
  );
};

export default CategoryNotFound;
