import { useRef, useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../../services/api/customerProductService';

import { getTheme } from '../../../utils/themes';
import { useCart } from '../../../context/CartContext';
import { Product } from '../../../types/domain';
import { useWishlist } from '../../../hooks/useWishlist';
import { calculateProductPrice } from '../../../utils/priceUtils';
import ProductCard from './ProductCard';

interface LowestPricesEverProps {
  activeTab?: string;
  products?: Product[]; // Admin-selected products from home data
}

// Helper function to truncate text to a maximum length
const truncateText = (text: string, maxLength: number = 60): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Product Card Component - Defined outside to prevent recreation on every render
// Local ProductCard component removed in favor of global one

export default function LowestPricesEver({ activeTab = 'all', products: adminProducts }: LowestPricesEverProps) {
  const theme = getTheme(activeTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { cart } = useCart();
  const navigate = useNavigate();
  const [fontLoaded, setFontLoaded] = useState(false);

  // Preload and wait for font to load to prevent FOUT
  useEffect(() => {
    if (document.fonts && document.fonts.check) {
      // Check if font is already loaded
      if (document.fonts.check('1em "Poppins"')) {
        setFontLoaded(true);
        return;
      }

      // Wait for font to load
      const checkFont = async () => {
        try {
          await document.fonts.load('1em "Poppins"');
          setFontLoaded(true);
        } catch (e) {
          // Fallback: show after timeout
          setTimeout(() => setFontLoaded(true), 300);
        }
      };

      checkFont();
    } else {
      // Fallback for browsers without Font Loading API
      setTimeout(() => setFontLoaded(true), 300);
    }
  }, []);

  // Memoize cart items lookup for performance
  const cartItemsMap = useMemo(() => {
    const map = new Map();
    cart.items.forEach(item => {
      if (item?.product) {
        map.set(item.product.id, item.quantity);
      }
    });
    return map;
  }, [cart.items]);

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Use admin-selected products if provided, otherwise fallback to fetching
    if (adminProducts && adminProducts.length > 0) {
      const mappedProducts = adminProducts.map((p: any) => {
        // Get product name and remove any description-like suffixes
        let productName = p.productName || p.name || '';
        // Remove common description patterns
        productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

        // Get pack without description
        let packValue = p.variations?.[0]?.title || p.pack || 'Standard';
        // Remove description from pack if it contains it
        if (packValue && packValue.includes(' - ')) {
          packValue = packValue.split(' - ')[0].trim();
        }

        return {
          ...p,
          id: p._id || p.id || p.id,
          name: productName,
          imageUrl: p.mainImage || p.imageUrl || p.mainImage,
          mrp: p.mrp || p.price,
          pack: packValue
        };
      });
      setProducts(mappedProducts);
    } else {
      // Fallback: fetch products if admin hasn't configured any
      const fetchDiscountedProducts = async () => {
        try {
          const response = await getProducts({ limit: 50 });
          if (response.success && response.data) {
            const mappedProducts = (response.data as any[]).map(p => {
              let productName = p.productName || p.name || '';
              productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

              let packValue = p.variations?.[0]?.title || p.pack || 'Standard';
              if (packValue && packValue.includes(' - ')) {
                packValue = packValue.split(' - ')[0].trim();
              }

              return {
                ...p,
                id: p._id || p.id,
                name: productName,
                imageUrl: p.mainImage || p.imageUrl,
                mrp: p.mrp || p.price,
                pack: packValue
              };
            });
            setProducts(mappedProducts);
          }
        } catch (err) {
          console.error("Failed to fetch products for LowestPricesEver", err);
        }
      };
      fetchDiscountedProducts();
    }
  }, [adminProducts]);

  // Get products for this section
  const getFilteredProducts = () => {
    // If admin has selected products, use them directly
    if (adminProducts && adminProducts.length > 0) {
      return products.slice(0, 20); 
    }

    // Fallback: filter by activeTab and discount
    let filtered = products;

    if (activeTab !== 'all') {
      if (activeTab === 'grocery') {
        filtered = products.filter((p) =>
          ['snacks', 'atta-rice', 'dairy-breakfast', 'masala-oil', 'biscuits-bakery', 'cold-drinks', 'fruits-veg'].includes(p.categoryId)
        );
      } else {
        filtered = products.filter((p) => p.categoryId === activeTab);
      }
    }

    return filtered
      .filter((product) => {
        if (!product.mrp) return false;
        const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
        return discount > 0;
      })
      .slice(0, 10); 
  };

  const discountedProducts = getFilteredProducts();

  // Get cart functions once at parent level
  const { addToCart, updateQuantity } = useCart();

  // Memoize callbacks to prevent ProductCard re-renders
  const handleAddToCart = useCallback((product: Product, element?: HTMLElement | null) => {
    addToCart(product, element);
  }, [addToCart]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
  }, [updateQuantity]);

  const isHome = activeTab === "all";
  const sectionGradient = isHome 
    ? "#FFFFFF" 
    : theme ? `linear-gradient(135deg, ${theme.primary[3] || '#FFFFFF'} 0%, ${theme.secondary[3] || '#FFFFFF'} 100%)` : 'transparent';

  return (
    <div
      className="relative"
      style={{
        background: sectionGradient,
        marginTop: '0px',
        paddingTop: '24px',
        paddingBottom: '32px',
      }}
    >
      {/* Header */}
      <div className="px-4 relative z-10 mb-5" data-section="lowest-prices">
        <h2
          className="font-bold leading-tight mb-0.5"
          style={{
            fontFamily: '"Poppins", sans-serif',
            fontSize: '18px',
            color: '#1a1a1a', 
            opacity: fontLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease-in',
          } as React.CSSProperties}
        >
          Lowest Prices Ever
        </h2>
        <div className="flex items-center justify-between">
           <p className="text-[12px] text-neutral-500 font-medium">
             Premium staples at warehouse rates.
           </p>
        </div>
      </div>

      {/* Product Content */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {discountedProducts.map((product) => (
          <div 
            key={product.id} 
            className="flex-shrink-0 w-[115px] md:w-[135px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ProductCard
              product={product}
              categoryStyle={true}
              showBadge={true}
              showHeartIcon={true}
            />
          </div>
        ))}
      </div>

      {/* See All Footer */}
      <div className="px-4 mt-6">
         <button 
           onClick={() => navigate('/category/lowest-prices')}
           className="w-full bg-[#fff0f3] hover:bg-[#ffe5ea] transition-colors py-3 rounded-2xl flex items-center justify-center gap-2"
         >
            <span className="text-[#ff3269] font-bold text-sm tracking-tight">See all</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="#ff3269" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
         </button>
      </div>
    </div>
  );
}
