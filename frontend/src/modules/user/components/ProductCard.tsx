import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from '../../../hooks/useLocation';
import { useToast } from '../../../context/ToastContext'; // Import useToast
import { addToWishlist, removeFromWishlist, getWishlist } from '../../../services/api/customerWishlistService';
import Button from '../../../components/ui/button';
import Badge from '../../../components/ui/badge';
import StarRating from '../../../components/ui/StarRating';
import { calculateProductPrice } from '../../../utils/priceUtils';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  showPackBadge?: boolean;
  showStockInfo?: boolean;
  showHeartIcon?: boolean;
  showRating?: boolean;
  showVegetarianIcon?: boolean;
  showOptionsText?: boolean;
  optionsCount?: number;
  compact?: boolean;
  categoryStyle?: boolean;
}

export default function ProductCard({
  product,
  showBadge = false,
  badgeText,
  showPackBadge = false,
  showStockInfo = false,
  showHeartIcon = false,
  showRating = false,
  showVegetarianIcon = false,
  showOptionsText = false,
  optionsCount = 2,
  compact = false,
  categoryStyle = false,
}: ProductCardProps) {
  if (!product) return null;
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast(); // Get toast function
  const imageRef = useRef<HTMLImageElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  // Single ref to track any cart operation in progress for this product
  const isOperationPendingRef = useRef(false);

  useEffect(() => {
    // Only check wishlist if user is authenticated
    if (!isAuthenticated) {
      setIsWishlisted(false);
      return;
    }

    const checkWishlist = async () => {
      try {
        const res = await getWishlist({
          latitude: location?.latitude,
          longitude: location?.longitude
        });
        if (res.success && res.data && res.data.products) {
          const targetId = String((product as any).id || product._id);
          const exists = res.data.products.some(p => String(p._id || (p as any).id) === targetId);
          setIsWishlisted(exists);
        }
      } catch (e) {
        // Silently fail if not logged in
        setIsWishlisted(false);
      }
    };
    checkWishlist();
  }, [product.id, product._id, isAuthenticated, location?.latitude, location?.longitude]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const targetId = String((product as any).id || product._id);
    const previousState = isWishlisted;

    try {
      if (isWishlisted) {
        // Optimistic update
        setIsWishlisted(false);
        await removeFromWishlist(targetId);
        showToast('Removed from wishlist');
      } else {
        if (!location?.latitude || !location?.longitude) {
           showToast('Location is required to add items to wishlist', 'error');
           return;
        }
        // Optimistic update
        setIsWishlisted(true);
        await addToWishlist(
          targetId,
          location?.latitude,
          location?.longitude
        );
        showToast('Added to wishlist');
      }
    } catch (e: any) {
      console.error('Failed to toggle wishlist:', e);
      setIsWishlisted(previousState);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to update wishlist';
      showToast(errorMessage, 'error');
    }
  };

  const cartItem = cart?.items?.find((item) => {
    if (!item?.product) return false;
    const itemProductId = String(item.product.id || item.product._id);
    const componentProductId = String((product as any).id || product._id);
    return itemProductId === componentProductId;
  });
  const inCartQty = cartItem?.quantity || 0;

  // Get Price and MRP using utility
  const { displayPrice, mrp, discount } = calculateProductPrice(product);

  const handleCardClick = () => {
    navigate(`/product/${((product as any).id || product._id) as string}`);
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      await addToCart(product, addButtonRef.current);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleDecrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current || inCartQty <= 0) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      const productId = String((product as any).id || product._id);
      await updateQuantity(productId, inCartQty - 1);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      if (inCartQty > 0) {
        const productId = String((product as any).id || product._id);
        await updateQuantity(productId, inCartQty + 1);
      } else {
        await addToCart(product, addButtonRef.current);
      }
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`${categoryStyle ? 'bg-purple-50' : 'bg-white'} rounded-lg shadow-sm overflow-hidden flex flex-col relative`}
    >
    <div
      onClick={handleCardClick}
      className={`relative cursor-pointer flex-1 flex flex-col ${categoryStyle ? 'bg-white p-2 md:p-3' : ''}`}
    >
      <div className={`w-full ${compact ? 'h-32 md:h-40' : categoryStyle ? 'h-28 md:h-36 mb-2' : 'h-40 md:h-48'} bg-neutral-100 flex items-center justify-center rounded-xl overflow-hidden relative`}>
        {product.imageUrl || product.mainImage ? (
          <img
            ref={imageRef}
            src={product.imageUrl || product.mainImage}
            alt={product.name || product.productName || 'Product'}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-icon')) {
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl fallback-icon';
                fallback.textContent = (product.name || product.productName || '?').charAt(0).toUpperCase();
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl">
            {(product.name || product.productName || '?').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Zepto-Style ADD Button Overlay for Category Style */}
        {categoryStyle && (
          <div className="absolute bottom-2 right-2 z-20">
             {inCartQty === 0 ? (
                <button
                  ref={addButtonRef}
                  disabled={product.isAvailable === false}
                  onClick={handleAdd}
                  className={`border-[1.5px] px-5 py-1.5 rounded-lg text-[13px] font-black shadow-lg transition-all active:scale-95 uppercase tracking-tight ${
                    product.isAvailable === false
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                    : 'bg-white border-[#ff4d6d] text-[#ff4d6d] hover:bg-red-50'
                  }`}
                >
                  {product.isAvailable === false ? 'Out of Range' : 'ADD'}
                </button>
             ) : (
                <div className={`bg-white border-[1.5px] rounded-lg shadow-lg flex items-center h-[34px] min-w-[80px] ${
                  product.isAvailable === false ? 'border-neutral-300 opacity-75' : 'border-[#ff4d6d]'
                }`}>
                   <button
                     onClick={handleDecrease}
                     className={`w-8 h-full flex items-center justify-center text-xl font-bold rounded-l-lg ${
                       product.isAvailable === false ? 'text-neutral-400' : 'text-[#ff3269] hover:bg-red-50'
                     }`}
                   >
                     −
                   </button>
                   <span className={`flex-1 text-center text-[13px] font-black ${
                     product.isAvailable === false ? 'text-neutral-400' : 'text-[#ff3269]'
                   }`}>
                     {inCartQty}
                   </span>
                   <button
                     disabled={product.isAvailable === false}
                     onClick={handleIncrease}
                     className={`w-8 h-full flex items-center justify-center text-lg font-bold rounded-r-lg ${
                       product.isAvailable === false ? 'text-neutral-400 cursor-not-allowed' : 'text-[#ff3269] hover:bg-red-50'
                     }`}
                   >
                     +
                   </button>
                </div>
             )}
          </div>
        )}

        {/* Badges and Wishlist */}
        {!categoryStyle && showBadge && (badgeText || discount > 0) && (
          <Badge variant="destructive" className="absolute top-2 left-2 z-10 text-xs px-2 py-1">
            {badgeText || `${discount}% OFF`}
          </Badge>
        )}

        {showHeartIcon && (
          <button
            onClick={toggleWishlist}
            className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isWishlisted ? "#ef4444" : "none"}
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-colors ${isWishlisted ? "text-red-500" : "text-neutral-400"}`}
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className={`flex-1 flex flex-col ${categoryStyle ? '' : 'p-4 md:p-5'}`}>
        {categoryStyle ? (
          <>
            {/* Price with Green Capsule - Zepto Design */}
            <div className="flex items-center gap-1.5 mb-1.5">
               <div className="bg-[#24904c] text-white text-[11px] font-black px-1.5 py-0.5 rounded flex items-center shadow-sm">
                  ₹{displayPrice.toLocaleString('en-IN')}
               </div>
               {mrp && mrp > displayPrice && (
                 <span className="text-[10px] text-neutral-400 line-through font-medium">
                   ₹{mrp.toLocaleString('en-IN')}
                 </span>
               )}
            </div>

            {/* Savings Text */}
            {mrp && mrp > displayPrice && (
              <p className="text-[10px] font-black text-[#24904c] mb-1 tracking-tight">
                ₹{ (mrp - displayPrice).toLocaleString('en-IN') } OFF
              </p>
            )}

            {/* Product Name */}
            <h3 className="text-[14px] font-black text-neutral-900 leading-tight line-clamp-2 mb-1">
              {product.name || product.productName || ''}
            </h3>

            {/* Pack Size */}
            <p className="text-[12px] text-neutral-500 font-medium mb-1.5">
              {product.variations?.[0]?.value || product.pack || 'Variable Size'}
            </p>

            {/* Meta tags - Carbide Free, etc. */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto">
                 {product.tags.slice(0, 1).map((tag, idx) => (
                   <span key={idx} className="bg-[#f0f9f1] text-[#008296] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#e0f2f1]">
                     {tag}
                   </span>
                 ))}
              </div>
            )}
          </>
        ) : (
            // Non-category style layout (original)
            <>
              {!showPackBadge && (
                <p className={`${compact ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm'} text-neutral-500 mb-1`}>
                    {product.variations?.[0]?.value || product.pack}
                </p>
              )}

              <h3 className={`${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-semibold text-neutral-900 ${compact ? 'mb-1' : 'mb-2'} line-clamp-2 ${compact ? 'min-h-[2rem]' : 'min-h-[2.5rem]'}`}>
                {product.name || product.productName || ''}
              </h3>

              {/* Always show rating */}
              <div className={`${compact ? 'mb-1' : 'mb-2'}`}>
                <StarRating
                  rating={(product.rating || (product as any).rating) || 0}
                  reviewCount={(product.reviews || (product as any).reviewsCount) || 0}
                  size={compact ? 'sm' : 'md'}
                  showCount={true}
                />
              </div>

              {showStockInfo && (
                <p className="text-xs text-purple-600 mb-2 font-medium">
                  Fast delivery
                </p>
              )}

              {showVegetarianIcon && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-xs text-neutral-600">Vegetarian</span>
                </div>
              )}

              <div className="mt-auto mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base font-bold text-neutral-900">
                    ₹{displayPrice}
                  </span>
                  {mrp && mrp > displayPrice && (
                    <span className="text-xs text-neutral-500 line-through">
                      ₹{mrp}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!categoryStyle && (
        <div className={`${compact ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
          <div className="mt-auto">
            {inCartQty === 0 ? (
              <div>
                <Button
                  ref={addButtonRef}
                  variant="outline"
                  size="sm"
                  disabled={product.isAvailable === false}
                  onClick={handleAdd}
                  className={`w-full border h-8 text-xs font-semibold uppercase tracking-wide ${
                    product.isAvailable === false
                    ? 'border-neutral-300 text-neutral-400 bg-neutral-50 cursor-not-allowed'
                    : 'border-purple-600 text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  {product.isAvailable === false ? 'Out of Range' : 'Add'}
                </Button>
                <div className="h-4 mt-1">
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-white border border-purple-600 rounded-full px-2 py-0.5 h-8">
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleDecrease}
                  className="w-6 h-6 p-0 bg-transparent text-purple-600 hover:bg-purple-50 shadow-none"
                  aria-label="Decrease quantity"
                >
                  −
                </Button>
                <span className="text-xs font-bold text-purple-600 min-w-[1.5rem] text-center">
                  {inCartQty}
                </span>
                <Button
                  variant="default"
                  size="icon"
                  disabled={product.isAvailable === false}
                  onClick={handleIncrease}
                  className={`w-6 h-6 p-0 bg-transparent text-purple-600 shadow-none ${
                    product.isAvailable === false ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-purple-50'
                  }`}
                  aria-label="Increase quantity"
                >
                  +
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
