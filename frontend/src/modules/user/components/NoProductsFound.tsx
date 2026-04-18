import React from 'react';
import { motion } from 'framer-motion';

export default function NoProductsFound() {
  return (
    <div className="flex flex-col items-center justify-center py-4 md:py-8 px-4 text-center w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-32 h-32 md:w-48 md:h-48 mb-4 md:mb-6"
      >
        {/* Decorative Elements */}
        <motion.div 
           animate={{ rotate: [0, 10, -10, 0] }}
           transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-4 -left-2 text-gray-400 opacity-40 font-black text-lg md:text-xl"
        >
          ×
        </motion.div>
        <motion.div 
           animate={{ rotate: [0, -15, 15, 0] }}
           transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-10 -right-4 text-gray-400 opacity-40 font-black text-lg md:text-xl"
        >
          ~
        </motion.div>
        <div className="absolute bottom-6 -right-2 w-2 h-2 rounded-full border-2 border-gray-200 opacity-40" />
        <div className="absolute top-24 -left-4 w-3 h-3 rounded-full border-2 border-gray-200 opacity-40" />

        {/* The Shopping Bag Illustration */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bag Handle */}
          <path
            d="M70 60C70 43.4315 83.4315 30 100 30C116.569 30 130 43.4315 130 60"
            stroke="#9ca3af"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Bag Body - Main */}
          <path
            d="M60 60H140L155 170H45L60 60Z"
            fill="white"
            stroke="#9ca3af"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          
          {/* Bag Accent - Pink Stripe */}
          <path
            d="M130 60H140L155 170H145L130 60Z"
            fill="#ff3269"
            className="opacity-90"
          />

          {/* Bag Decorative Lines (Bottom Edge Shadow etc) */}
          <path d="M48 165L152 165" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" />

          {/* Sad Face */}
          <g transform="translate(100, 115)">
            {/* Eyes */}
            <circle cx="-15" cy="-10" r="4.5" fill="#9ca3af" />
            <circle cx="15" cy="-10" r="4.5" fill="#9ca3af" />
            
            {/* Mouth (Sad Curve) */}
            <path
              d="M-20 18C-20 18 -10 5 0 5C10 5 20 18 20 18"
              stroke="#9ca3af"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Sparkle icon from design */}
          <path d="M15 155L25 145M25 145L35 155M25 145L25 130M25 145L25 160" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" transform="translate(20, -10)" />
        </svg>
      </motion.div>

      {/* Text Elements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="space-y-1.5 md:space-y-4"
      >
        <span className="text-[#ff3269] text-3xl md:text-5xl font-black tracking-tight block">
          Oops!
        </span>
        <h3 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">
          No Product Found...
        </h3>
        <p className="text-gray-500 font-bold text-sm md:text-lg max-w-[200px] md:max-w-xs mx-auto">
          You Can Try Our Different Product...
        </p>
      </motion.div>
    </div>
  );
}
