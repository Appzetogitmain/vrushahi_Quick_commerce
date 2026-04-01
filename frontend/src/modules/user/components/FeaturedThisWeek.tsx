import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProducts } from '../../../services/api/customerProductService';

interface FeaturedItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  buttonText: string;
}

const featuredItems: FeaturedItem[] = [
  {
    id: 'beauty-essentials',
    badge: 'GLOW UP',
    title: 'Beauty Essentials',
    description: 'Premium skincare and makeup products for your daily routine.',
    imageUrl: '/assets/beauty_featured.jpg',
    categoryId: 'beauty',
    buttonText: 'Shop Beauty'
  },
  {
    id: 'fashion-trends',
    badge: 'STYLE SELECTION',
    title: 'Fashion Trends',
    description: 'Discover the latest styles and trends in clothing and accessories.',
    imageUrl: '/assets/fashion_featured.jpg',
    categoryId: 'fashion',
    buttonText: 'Explore Style'
  },
  {
    id: 'grocery-staples',
    badge: 'DAILY FRESH',
    title: 'Grocery Staples',
    description: 'Get all your daily essentials and fresh produce delivered fast.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
    categoryId: 'grocery',
    buttonText: 'Order Grocery'
  }
];

export default function FeaturedThisWeek() {
  const navigate = useNavigate();

  return (
    <div className="mb-8 mt-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <div>
          <h2 className="text-[22px] font-black text-neutral-900 tracking-tight leading-tight">
            Featured this week
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            Curated selections for the discerning palate.
          </p>
        </div>
        <Link 
          to="/categories" 
          className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors"
        >
          See All
        </Link>
      </div>

      <div className="relative mt-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4">
          {featuredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/category/${item.categoryId}`)}
              className="flex-shrink-0 w-[175px] md:w-[215px] aspect-[4/5] rounded-[1.5rem] overflow-hidden relative cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Background Image */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70 z-10"></div>
              
              {/* Badge */}
              <div className="absolute top-3 left-3 z-20">
                <div className="bg-black/30 backdrop-blur-md border border-white/20 px-2.5 py-0.5 rounded-full text-[8px] font-black text-white tracking-widest uppercase">
                  {item.badge}
                </div>
              </div>

              {/* Text Content */}
              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-start z-30 transition-transform duration-300">
                <h3 className="text-lg font-black text-white mb-1 leading-tight">
                  {item.title}
                </h3>
                <p className="text-[10px] text-white/90 font-medium line-clamp-2 mb-4 leading-normal max-w-[95%]">
                  {item.description}
                </p>
                
                {/* Button */}
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg text-[10px] font-black tracking-wide hover:bg-purple-700 transition-colors shadow-lg active:scale-95">
                  {item.buttonText}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

