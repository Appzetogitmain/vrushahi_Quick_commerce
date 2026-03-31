import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import Button from '../../components/ui/button';

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

import { getProducts } from '../../services/api/customerProductService';
import WishlistButton from '../../components/WishlistButton';
import { calculateProductPrice } from '../../utils/priceUtils';
import { useLocation as useLocationContext } from '../../hooks/useLocation';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-700';
    case 'On the way':
      return 'bg-blue-100 text-blue-700';
    case 'Accepted':
      return 'bg-yellow-100 text-yellow-700';
    case 'Placed':
      return 'bg-neutral-100 text-neutral-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

export default function OrderAgain() {
  const { orders } = useOrders();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location: userLocation } = useLocationContext();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());
  const [fontLoaded, setFontLoaded] = useState(false);

  // Preload and wait for font to load to prevent FOUT
  useEffect(() => {
    if (typeof document !== 'undefined' && (document as any).fonts) {
      (document as any).fonts.ready.then(() => {
         setFontLoaded(true);
      });
    } else {
      setTimeout(() => setFontLoaded(true), 500);
    }
  }, []);

  // Simplified ProductCard for high-density listing
  const ProductCard = ({ product }: { product: any }) => {
    const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);
    const cartItem = cart.items.find(item => item?.product && String(item.product.id || (item.product as any)._id) === String(product.id || (product as any)._id));
    const inCartQty = cartItem?.quantity || 0;
    const displayName = (product.name || product.productName || '').replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();
    const categoryName = product.categoryName || 'General';

    return (
      <div className="bg-white rounded-xl overflow-visible flex flex-col relative h-full">
        {/* Product Image Area */}
        <div 
          onClick={() => navigate(`/product/${product.id}`)}
          className="relative block mb-2 cursor-pointer"
        >
          <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden relative border border-neutral-100 shadow-sm">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* ADD Button or Quantity Stepper - OVERLAY on Image */}
            <div className="absolute bottom-1 right-1 z-30">
              {inCartQty === 0 ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(product, e.currentTarget);
                  }}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-[#ff3269] flex items-center justify-center text-[#ff3269] shadow-md active:scale-95 transition-all hover:bg-pink-50"
                >
                  <span className="text-2xl font-bold leading-none">+</span>
                </button>
              ) : (
                <div
                  className="flex items-center justify-between bg-[#ff3269] rounded-xl h-9 px-1 shadow-md border-2 border-[#ff3269]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateQuantity(String(product.id || (product as any)._id), Math.max(0, inCartQty - 1));
                    }}
                    className="w-6 h-6 flex items-center justify-center text-white text-lg font-black hover:bg-white/10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white font-black text-xs min-w-[18px] text-center px-0.5">
                    {inCartQty}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateQuantity(String(product.id || (product as any)._id), inCartQty + 1);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-white text-lg font-black hover:bg-white/10 rounded-lg transition-colors"
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
              ₹{displayPrice}
            </div>
            {hasDiscount && (
              <span className="text-[11px] text-neutral-400 line-through font-medium leading-none">
                ₹{mrp}
              </span>
            )}
          </div>
          {discount > 0 && (
            <div className="text-[10px] font-black text-[#24904c] tracking-tight">
              ₹{Math.max(0, mrp - displayPrice)} OFF
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="px-1 flex-1 flex flex-col min-h-0 pb-2">
          <div onClick={() => navigate(`/product/${product.id}`)}>
            <h3 className="text-[13px] font-black text-neutral-900 line-clamp-2 leading-tight mb-1">
              {displayName}
            </h3>
          </div>

          <div className="text-[11px] font-medium text-neutral-500 mb-2">
            {product.pack || product.unit || '1 unit'}
          </div>

          {/* Tags & Rating */}
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
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
    );
  };

  // Handle "Order Again" - Add all items from an order to cart
  const handleOrderAgain = (order: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark this order as added
    setAddedOrders(prev => new Set(prev).add(order.id));

    // Add each item from the order to the cart
    order.items
      .filter((item: any) => item?.product) // Filter out items with null/undefined products
      .forEach((item: any) => {
        // Check if product is already in cart
        const existingCartItem = cart.items.find(cartItem => cartItem?.product && cartItem.product.id === item.product.id);

        if (existingCartItem) {
          // If already in cart, add the order quantity to existing quantity
          updateQuantity(item.product.id, existingCartItem.quantity + item.quantity);
        } else {
          // If not in cart, add it first (adds 1)
          addToCart(item.product);
          // Then update to the correct quantity if needed
          if (item.quantity > 1) {
            // Use setTimeout to ensure the item is added first
            setTimeout(() => {
              updateQuantity(item.product.id, item.quantity);
            }, 10);
          }
        }
      });
  };

  // Get bestseller products
  const [bestsellerProducts, setBestsellerProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        const response = await getProducts({ sort: 'popular', limit: 6 });
        if (response.success && response.data) {
        const mapped = (response.data as any[]).map(p => {
          // Clean product name - remove description suffixes
          let productName = p.productName || p.name || '';
          productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

          return {
            ...p,
            id: p._id || p.id,
            name: productName,
            imageUrl: p.mainImage || p.imageUrl,
            mrp: p.mrp || p.price,
            pack: p.variations?.[0]?.title || p.smallDescription || 'Standard'
          };
        });
          setBestsellerProducts(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch bestsellers:', error);
      }
    };
    fetchBestsellers();
  }, []);

  // Get unique products from previous orders
  const previousOrderedProducts = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const productMap = new Map();
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.product && !productMap.has(item.product.id)) {
          productMap.set(item.product.id, {
            ...item.product,
            id: item.product.id || (item.product as any)._id
          });
        }
      });
    });
    return Array.from(productMap.values());
  }, [orders]);

  const hasOrders = previousOrderedProducts.length > 0;
  const displayProducts = hasOrders ? previousOrderedProducts : bestsellerProducts;

  return (
    <div className="pb-24 min-h-screen bg-white">
      {/* Header Bar */}
      <div className="px-4 py-4 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-1 rounded-full hover:bg-neutral-100 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex items-center gap-1">
             <span className="text-[13px] font-black text-neutral-900 tracking-tight line-clamp-1 max-w-[140px]">
               {userLocation?.address || 'Select Location'}
             </span>
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/search')}
          className="p-2.5 rounded-full bg-neutral-50 hover:bg-neutral-100 transition-colors shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Purple Awning Graphic */}
      <div className="relative w-full h-12 mb-4">
        <div 
           className="absolute inset-0 flex" 
           style={{
             background: 'linear-gradient(to bottom, #f3e8ff, #ffffff)',
           }}
        >
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 h-10 ${i % 2 === 0 ? 'bg-[#9333ea]' : 'bg-[#cdbae0]'} rounded-b-full shadow-sm`}
              style={{
                opacity: 0.2 + (Math.sin(i * 0.5) * 0.1),
                transform: 'scaleY(0.9)',
                marginTop: '-4px'
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Section Title */}
      <div className="px-6 mb-8 text-center">
         <div className="inline-block relative">
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight uppercase">
              Buy <span className="text-[#9333ea]">Again</span>
            </h2>
            <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-[#9333ea] opacity-40 blur-[1px]"></div>
         </div>
         {displayProducts.length > 0 && !hasOrders && (
            <p className="mt-4 text-xs font-bold text-neutral-500 tracking-wide uppercase">
              Recommended for you
            </p>
         )}
      </div>

      {/* Product Grid */}
      <div className="px-4">
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
             <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M4 9h16v12H4V9z" stroke="#94a3b8" strokeWidth="2" />
                </svg>
             </div>
             <h3 className="text-lg font-black text-neutral-900 mb-1">Nothing to buy again yet</h3>
             <p className="text-sm text-neutral-500 font-medium max-w-[240px]">
               Start shopping and your ordered items will appear here!
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
