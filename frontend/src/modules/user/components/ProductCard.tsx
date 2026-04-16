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
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative group h-full`}
    >
      <div
        onClick={handleCardClick}
        className="relative cursor-pointer aspect-square bg-white rounded-t-2xl"
      >
        <div className="w-full h-full overflow-hidden rounded-t-2xl">
          {product.imageUrl || product.mainImage ? (
            <img
              ref={imageRef}
              src={product.imageUrl || product.mainImage}
              alt={product.name || product.productName || 'Product'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-3xl font-bold">
              {(product.name || product.productName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-0 left-0 z-10">
            <div className="bg-[#24904c] text-white text-[10px] font-black px-2 py-1 rounded-br-lg shadow-sm uppercase tracking-tighter">
              {discount}% OFF
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        {showHeartIcon && (
          <button
            onClick={toggleWishlist}
            className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center hover:bg-white transition-all shadow-sm border border-white/50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isWishlisted ? "#ef4444" : "none"}
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-colors ${isWishlisted ? "text-red-500" : "text-gray-400"}`}
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

        {/* Floating ADD Button Overlay - Exactly sitting on the border */}
        <div className="absolute -bottom-[14px] right-2 z-20">
          {inCartQty === 0 ? (
            <button
              ref={addButtonRef}
              disabled={product.isAvailable === false}
              onClick={handleAdd}
              className={`w-7 h-7 md:w-8 md:h-8 rounded bg-white flex items-center justify-center shadow-sm border ${
                product.isAvailable === false
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-[#ff3269]/40 text-[#ff3269] active:bg-pink-50'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <div className="bg-white border border-[#ff3269]/40 rounded shadow-sm flex items-center h-7 md:h-8 min-w-[65px] md:min-w-[75px] overflow-hidden">
              <button
                onClick={handleDecrease}
                className="w-7 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-50 transition-colors font-semibold text-lg"
              >
                −
              </button>
              <span className="flex-1 text-center text-xs font-black text-gray-800">
                {inCartQty}
              </span>
              <button
                disabled={product.isAvailable === false}
                onClick={handleIncrease}
                className="w-8 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-50 transition-colors font-black text-lg"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-2 pt-2.5 flex-1 flex flex-col relative" onClick={handleCardClick}>
        {/* Product Name */}
        <h3 className="text-[12px] md:text-[13px] font-semibold text-gray-900 leading-[1.3] line-clamp-2 mb-1 group-hover:text-amber-700 transition-colors pr-2 h-[32px] md:h-[34px]">
          {product.name || product.productName || ''}
        </h3>

        {/* Pricing */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[12px] md:text-[13px] font-bold text-gray-900">
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>
          {mrp && mrp > displayPrice && (
            <span className="text-[10px] text-gray-400 line-through font-medium">
              ₹{mrp.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Meta Info: Rating & Time Stacked */}
        <div className="mt-auto flex flex-col gap-[3px] pt-1">
          {/* Rating Row */}
          <div className="flex items-center gap-[1px]">
             {[1, 2, 3, 4, 5].map((star) => (
                <svg 
                  key={star} 
                  className={star <= Math.round(product.rating || 0) ? "text-gray-400 fill-gray-400" : "text-gray-200 fill-gray-200"} 
                  width="10" height="10" viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
             ))}
             <span className="text-[10px] font-medium text-gray-400 ml-1">
               ({(product as any).reviewsCount || (product as any).reviews || 0})
             </span>
          </div>

          {/* Time Row */}
          <div className="flex items-center gap-1.5 w-fit rounded-full px-1.5 py-[2px] bg-sky-50 shadow-[0_4px_10px_-4px_rgba(56,189,248,0.4)] border border-sky-100">
             <svg className="text-sky-600" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
             </svg>
             <span className="text-[9px] md:text-[10px] font-bold text-sky-700 tracking-tight">21 min</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
