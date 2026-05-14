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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const productId = String((product as any).id || product._id);
    const productUrl = `${window.location.origin}/product/${productId}`;
    const shareData = {
      title: product?.name || product?.productName || 'Check out this product!',
      text: `Check out ${product?.name || product?.productName} on Quick Commerce!`,
      url: productUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(productUrl);
        showToast('Product link copied to clipboard!');
      } catch (err) {
        showToast('Failed to copy link.', 'error');
      }
    }
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

    if (inCartQty <= 0) {
      return;
    }

    try {
      const productId = String((product as any).id || product._id);
      await updateQuantity(productId, inCartQty - 1);
    } catch (error) {
      console.error("Error decreasing quantity:", error);
    }
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    try {
      if (inCartQty > 0) {
        const productId = String((product as any).id || product._id);
        await updateQuantity(productId, inCartQty + 1);
      } else {
        await addToCart(product, addButtonRef.current);
      }
    } catch (error) {
      console.error("Error increasing quantity:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col relative group h-full overflow-hidden`}
    >
      <div
        onClick={handleCardClick}
        className="relative cursor-pointer aspect-[1/0.95] bg-gray-50 flex items-center justify-center"
      >
        <div className="w-full h-full overflow-hidden">
          {product.imageUrl || product.mainImage || (product.variations && product.variations.find((v: any) => !!v.image)?.image) ? (
            <img
              ref={imageRef}
              src={product.imageUrl || product.mainImage || product.variations?.find((v: any) => !!v.image)?.image}
              alt={product.name || product.productName || 'Product'}
              className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-2xl font-bold">
              {(product.name || product.productName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-0 left-0 z-10">
            <div className="bg-[#24904c] text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg shadow-sm uppercase tracking-tighter">
              {discount}% OFF
            </div>
          </div>
        )}

        {/* Top Right Actions: Share & Wishlist */}
        <div className="absolute top-1.5 right-1.5 z-30 flex items-center gap-1">
          <button
            onClick={handleShare}
            title="Share Product"
            className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm border border-gray-100 text-gray-600 hover:text-gray-900"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
          {showHeartIcon && (
            <button
              onClick={toggleWishlist}
              title="Wishlist"
              className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm border border-gray-100"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "#ff3269" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-colors ${isWishlisted ? "text-[#ff3269]" : "text-gray-300"}`}
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Floating ADD Button Overlay - Exactly sitting on the border */}
        <div className="absolute -bottom-4 right-1.5 z-20">
          {inCartQty === 0 ? (
            <button
              ref={addButtonRef}
              disabled={product.isAvailable === false}
              onClick={handleAdd}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shadow-sm transition-all border-2 ${
                product.isAvailable === false
                ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-[#ff3269] text-[#ff3269] active:scale-90 hover:bg-pink-50 hover:shadow-pink-100'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm flex items-center h-8 md:h-9 min-w-[70px] md:min-w-[85px] overflow-hidden border-2 border-[#ff3269]">
              <button
                onClick={handleDecrease}
                className="w-7 md:w-8 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-50 transition-colors font-bold text-lg"
              >
                −
              </button>
              <span className="flex-1 text-center text-[12px] md:text-[13px] font-black text-gray-800">
                {inCartQty}
              </span>
              <button
                disabled={product.isAvailable === false}
                onClick={handleIncrease}
                className="w-7 md:w-8 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-50 transition-colors font-black text-lg"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 pt-2.5 flex-1 flex flex-col relative" onClick={handleCardClick}>
        {/* Product Name */}
        <h3 className="text-[11px] md:text-[12px] font-bold text-gray-800 leading-[1.3] line-clamp-2 mb-1 group-hover:text-[#ff3269] transition-colors pr-4 h-[28px] md:h-[32px]">
          {product.name || product.productName || ''}
        </h3>

        {/* Pricing */}
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <span className="text-[11px] md:text-[12px] font-black text-gray-900">
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>
          {mrp && mrp > displayPrice && (
            <span className="text-[9px] text-gray-400 line-through font-medium">
              ₹{mrp.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Meta Info: Rating & Time Stacked */}
        <div className="mt-auto flex flex-col gap-1 pt-1">
          {/* Rating Row */}
          <div className="flex items-center gap-[1px]">
             {[1, 2, 3, 4, 5].map((star) => (
                <svg 
                  key={star} 
                  className={star <= Math.round(product.rating || 0) ? "text-[#ffb800] fill-[#ffb800]" : "text-gray-200 fill-gray-200"} 
                  width="8" height="8" viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
             ))}
             <span className="text-[9px] font-medium text-gray-400 ml-1">
               ({(product as any).reviewsCount || (product as any).reviews || 0})
             </span>
          </div>

          {/* Time Row */}
          <div className="flex items-center gap-1 w-fit rounded-lg px-1.5 py-[1px] bg-neutral-50 border border-neutral-100">
             <svg className="text-gray-400" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
             </svg>
             <span className="text-[8px] md:text-[9px] font-black text-gray-600 uppercase tracking-tighter">24 MINS</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
