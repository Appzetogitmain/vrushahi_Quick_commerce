import { useRef, useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../../services/api/customerProductService';

import { getTheme } from '../../../utils/themes';
import { useCart } from '../../../context/CartContext';
import { Product } from '../../../types/domain';
import { useWishlist } from '../../../hooks/useWishlist';
import { calculateProductPrice } from '../../../utils/priceUtils';

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
const ProductCard = memo(({
  product,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity
}: {
  product: Product;
  cartQuantity: number;
  onAddToCart: (product: Product, element?: HTMLElement | null) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist(product.id);

  // Get Price and MRP using utility
  const { displayPrice, mrp, discount } = calculateProductPrice(product);

  // Use cartQuantity from props
  const inCartQty = cartQuantity;

  // Get product name, clean it (remove description suffixes), and truncate if needed
  let productName = product.name || product.productName || '';
  // Remove common description patterns
  productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();
  const displayName = truncateText(productName, 40);

  // Clean Category name: if it's a hex ID (24 chars), use a fallback or truncate
  let categoryName = (product.categoryId || 'BASIC STAPLE').replace(/-/g, ' ').toUpperCase();
  if (/^[0-9a-fA-F]{24}$/.test(categoryName)) {
    categoryName = 'PREMIUM ITEM';
  }

  return (
    <div
      className="flex-shrink-0 w-[150px] md:w-[180px]"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className="bg-white rounded-xl overflow-visible flex flex-col relative h-full cursor-pointer group"
      >
        {/* Product Image Area */}
        <div 
          onClick={() => navigate(`/product/${product.id}`)}
          className="relative block mb-2"
        >
          <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden relative border border-neutral-100 shadow-sm">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-3xl font-bold">
                {(product.name || product.productName || '?').charAt(0).toUpperCase()}
              </div>
            )}

            {/* ADD Button or Quantity Stepper - OVERLAY on Image */}
            <div className="absolute bottom-1 right-1 z-30">
              {inCartQty === 0 ? (
                <button
                  disabled={product.isAvailable === false}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCart(product, e.currentTarget);
                  }}
                  className="px-4 h-9 rounded-xl bg-white border-2 border-[#ff3269] flex items-center justify-center text-[#ff3269] shadow-md active:scale-95 transition-all hover:bg-pink-50 text-[13px] font-black uppercase tracking-tighter"
                  title="Add to Cart"
                >
                  ADD
                </button>
              ) : (
                <div
                  className="flex items-center justify-between bg-white rounded-xl h-9 px-1 shadow-md border-2 border-[#ff3269]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateQuantity(String(product.id || (product as any)._id), Math.max(0, inCartQty - 1));
                    }}
                    className="w-6 h-6 flex items-center justify-center text-[#ff3269] text-lg font-black hover:bg-pink-50 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <span className="text-[#ff3269] font-black text-xs min-w-[18px] text-center px-0.5">
                    {inCartQty}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateQuantity(String(product.id || (product as any)._id), inCartQty + 1);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-[#ff3269] text-lg font-black hover:bg-pink-50 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Info - Green Badge Style */}
        <div className="px-1 mb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="bg-[#24904c] text-white text-[11px] font-black px-1.5 py-0.5 rounded-md leading-none">
              ₹{product.price}
            </div>
            {mrp > product.price && (
              <span className="text-[11px] text-neutral-400 line-through font-medium leading-none">
                ₹{mrp}
              </span>
            )}
          </div>
          {discount > 0 && (
            <div className="text-[10px] font-black text-[#24904c] tracking-tight">
              ₹{Math.max(0, mrp - product.price)} OFF
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="px-1 flex-1 flex flex-col min-h-0">
          <div onClick={() => navigate(`/product/${product.id}`)}>
            <h3 className="text-[13px] font-black text-neutral-900 line-clamp-2 leading-tight mb-1 mb-1">
              {displayName}
            </h3>
          </div>

          <div className="text-[11px] font-medium text-neutral-500 mb-2">
            {product.pack || '1 unit'}
          </div>

          {/* Tags & Rating */}
          <div className="mt-auto flex flex-col gap-1.5 pb-2">
             <div className="flex flex-wrap gap-1">
                <span className="bg-[#eef9fa] text-[#0a8ba0] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {categoryName.split(' ')[0]}
                </span>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-bold">
                <span className="text-green-600">★</span>
                <span>4.6 (9.5k)</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps: any, nextProps: any) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.cartQuantity === nextProps.cartQuantity
  );
});

ProductCard.displayName = 'ProductCard';

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
          className="font-black leading-tight mb-0.5"
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
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {discountedProducts.map((product) => {
          const cartQuantity = cartItemsMap.get(product.id) || 0;
          return (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={cartQuantity}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
            />
          );
        })}
      </div>

      {/* See All Footer */}
      <div className="px-4 mt-6">
         <button 
           onClick={() => navigate('/category/all')}
           className="w-full bg-[#fff0f3] hover:bg-[#ffe5ea] transition-colors py-3 rounded-2xl flex items-center justify-center gap-2"
         >
            <span className="text-[#ff3269] font-black text-sm tracking-tight">See all</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="#ff3269" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
         </button>
      </div>
    </div>
  );
}
