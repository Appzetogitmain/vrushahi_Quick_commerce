import {
  useParams,
  useNavigate,
  useLocation as useRouterLocation,
} from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { products } from '../../data/products'; // REMOVED
// import { categories } from '../../data/categories'; // REMOVED
import { useCart } from "../../context/CartContext";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import { getProductById } from "../../services/api/customerProductService";
import { getAddresses, Address } from "../../services/api/customerAddressService";
import WishlistButton from "../../components/WishlistButton";
import StarRating from "../../components/ui/StarRating";
import { calculateProductPrice } from "../../utils/priceUtils";
import ProductCard from "./components/ProductCard";
import { Search, ShoppingCart, ArrowLeft, Heart, Truck, MapPin, ChevronRight, Share2, Info, Package } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isProductDetailsExpanded, setIsProductDetailsExpanded] =
    useState(false);
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [deliveredAddress, setDeliveredAddress] = useState<Address | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailableAtLocation, setIsAvailableAtLocation] =
    useState<boolean>(true);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      startLoading();
      try {
        // Check if navigation came from store page
        const fromStore = (routerLocation.state as any)?.fromStore === true;

        // Fetch product details with location
        const response = await getProductById(
          id,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          const productData = response.data as any;

          // Set location availability flag
          setIsAvailableAtLocation(productData.isAvailableAtLocation !== false);

          // Get all images (main + gallery)
          const allImages = [
            productData.mainImage || productData.imageUrl || "",
            ...(productData.galleryImages ||
              productData.galleryImageUrls ||
              []),
          ].filter(Boolean);

          setProduct({
            ...productData,
            // Ensure all critical fields have safe defaults
            id: productData._id || productData.id,
            name: productData.productName || productData.name || "Product",
            imageUrl: productData.mainImage || productData.imageUrl || "",
            allImages: allImages,
            price: productData.price || 0,
            mrp: productData.mrp || productData.price || 0,
            pack:
              productData.variations?.[0]?.title ||
              productData.variations?.[0]?.value ||
              productData.smallDescription ||
              "Standard",
          });

          // Initialize variations
          if (productData.variations && productData.variations.length > 0) {
            const firstVar = productData.variations[0];
            setSelectedColor(firstVar.color || "");
            setSelectedSize(firstVar.size || "");
            setSelectedVariantIndex(0);
          } else {
            setSelectedVariantIndex(0);
          }

          // Reset selected image when product changes
          setSelectedImageIndex(0);
          setSimilarProducts(response.data.similarProducts || []);

          // Fetch reviews
          fetchReviews(id);
        } else {
          setProduct(null);
          setError(response.message || "Product not found");
        }
      } catch (error: any) {
        console.error("Failed to fetch product", error);
        setProduct(null);
        setError(
          error.message || "Something went wrong while fetching product details"
        );
      } finally {
        setLoading(false);
        stopLoading();
      }
    };

    const fetchReviews = async (productId: string) => {
      setReviewsLoading(true);
      try {
        const { getProductReviews } = await import(
          "../../services/api/customerReviewService"
        );
        const res = await getProductReviews(productId);
        if (res.success) {
          setReviews(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchProduct();
  }, [id, location?.latitude, location?.longitude]);

  // Fetch User's Default Address
  useEffect(() => {
    const fetchDefaultAddress = async () => {
      if (!isAuthenticated) {
        setDeliveredAddress(null);
        return;
      }

      setIsAddressLoading(true);
      try {
        const response = await getAddresses();
        if (response.success && response.data) {
          const addresses = Array.isArray(response.data) ? response.data : [response.data];
          // Pick default address or first one
          const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0] || null;
          setDeliveredAddress(defaultAddr);
        }
      } catch (error) {
        console.error("Failed to fetch addresses:", error);
      } finally {
        setIsAddressLoading(false);
      }
    };

    fetchDefaultAddress();
  }, [isAuthenticated]);

  // Get variations grouped by color
  const colorGroups = product?.variations?.reduce((acc: any, curr: any) => {
    const color = curr.color || "Default";
    if (!acc[color]) acc[color] = [];
    acc[color].push(curr);
    return acc;
  }, {}) || {};

  const colors = Object.keys(colorGroups);
  
  // Available sizes for selected color
  const availableSizes = selectedColor 
    ? [...new Set(colorGroups[selectedColor]?.map((v: any) => v.size).filter(Boolean))] as string[]
    : [];

  // Check if we should show generic variations (if color/size schema isn't fully used but multiple variants exist)
  const showGenericVariations = 
    product?.variations && 
    product.variations.length > 1 && 
    (colors.length <= 1 && colors[0] === "Default") && 
    availableSizes.length === 0;

  // Update selected variant when color or size changes
  useEffect(() => {
    if (product?.variations) {
      const index = product.variations.findIndex((v: any) => {
        if (selectedColor && selectedSize) {
          return v.color === selectedColor && v.size === selectedSize;
        } else if (selectedColor) {
          return v.color === selectedColor;
        } else if (selectedSize) {
          return v.size === selectedSize;
        }
        return false;
      });
      if (index !== -1) {
        setSelectedVariantIndex(index);
      }
    }
  }, [selectedColor, selectedSize, product?.variations]);

  // Get selected variant
  const selectedVariant = product?.variations?.[selectedVariantIndex] || null;
  const {
    displayPrice: variantPrice,
    mrp: variantMrp,
    discount,
    hasDiscount,
  } = calculateProductPrice(product, selectedVariantIndex);

  const variantStock =
    selectedVariant?.stock !== undefined
      ? selectedVariant.stock
      : product?.stock || 0;
  const variantTitle =
    selectedVariant?.title ||
    selectedVariant?.value ||
    product?.pack ||
    "Standard";
  const isVariantAvailable =
    selectedVariant?.status !== "Sold out" &&
    (variantStock > 0 || variantStock === 0); // 0 means unlimited

  // Get all images for gallery
  const allImages =
    product?.allImages || [product?.imageUrl || ""].filter(Boolean);
  const currentImage = allImages[selectedImageIndex] || product?.imageUrl || "";

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end - perform swipe
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImageIndex < allImages.length - 1) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }

    if (isRightSwipe && selectedImageIndex > 0) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  // Get quantity in cart - check by product ID and variant if available
  const cartItem = product
    ? cart.items.find((item) => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      const productId = product.id || product._id;

      if (itemProductId !== productId) return false;

      // If product has variations, we need to match the selected one
      if (product.variations && product.variations.length > 0) {
        if (selectedVariant) {
          const itemVariantId =
            (item.product as any).variantId ||
            (item.product as any).selectedVariant?._id;
          const itemVariantTitle =
            (item.product as any).variantTitle || (item.product as any).pack;

          return (
            itemVariantId === selectedVariant._id ||
            itemVariantTitle === variantTitle ||
            (itemVariantId && itemVariantId === variantTitle)
          );
        }
        // If product has variations but none selected (shouldn't happen), don't match
        return false;
      }

      // If product has NO variations, any item with this product ID in cart is a match
      return true;
    })
    : null;
  const inCartQty = cartItem?.quantity || 0;

  if (loading && !product) {
    return null; // Let the global IconLoader handle this
  }

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-violet-600 text-white rounded-full font-medium hover:bg-violet-700 transition-colors">
          Try Refreshing
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            Product not found
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Get category info - safe access
  const category =
    product.category && product.category.name
      ? { name: product.category.name, id: product.category._id }
      : null;

  const handleAddToCart = () => {
    if (!isAvailableAtLocation) {
      // Show alert if trying to add item outside delivery area
      alert("This product is not available for delivery at your location.");
      return;
    }
    if (!isVariantAvailable && variantStock !== 0) {
      alert("This variant is currently out of stock.");
      return;
    }
    // Create product with selected variant info
    const productWithVariant = {
      ...product,
      price: variantPrice,
      mrp: variantMrp,
      pack: variantTitle,
      selectedVariant: selectedVariant,
      variantId: selectedVariant?._id,
      variantTitle: variantTitle,
    };
    addToCart(productWithVariant, addButtonRef.current);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header with Search and Cart */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-neutral-100">
        <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600"
            aria-label="Go back">
            <ArrowLeft size={24} />
          </button>

          {/* Search Bar */}
          <div className="flex-1 relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-pink-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text"
              placeholder="Search for products"
              readOnly
              onClick={() => navigate('/search')}
              className="w-full bg-neutral-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-pink-500 transition-all cursor-pointer"
            />
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigate('/cart')}
              className="relative p-2 text-neutral-600 hover:text-pink-600 transition-colors">
              <ShoppingCart size={24} />
              {cart.items.length > 0 && (
                <span className="absolute top-1 right-1 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.items.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="pt-16 pb-24 md:pb-32 lg:px-4 max-w-[1240px] mx-auto overflow-x-hidden relative">
        {/* Location Availability Banner */}
        {!isAvailableAtLocation && (
          <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 mx-4 mt-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 mt-0.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#f59e0b" />
                <path
                  d="M2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Not available at your location
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  This product cannot be delivered to your current location. You
                  can browse but cannot add to cart.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="md:flex md:gap-8 md:py-6 lg:p-8 md:items-start w-full">
          {/* Left Column - Image Gallery */}
          <div className="md:w-[45%] lg:w-[42%] md:sticky md:top-28 flex-shrink-0 z-20">
            {/* Product Image Gallery */}
            <div className="relative w-full bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden md:rounded-[2rem] md:shadow-sm md:border md:border-neutral-200 group/gallery">
              
              {/* Floating Wishlist Button on Image */}
              {product?.id && (
                <div className="absolute top-4 right-4 z-40">
                  <WishlistButton
                    productId={product.id}
                    size="md"
                    className="bg-white/80 backdrop-blur-md shadow-lg rounded-full p-2 hover:bg-white transition-all hover:scale-110 active:scale-90"
                  />
                </div>
              )}
          {/* Main Product Image - Swipeable on mobile */}
          <div
            className="w-full aspect-square relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              touchAction: allImages.length > 1 ? "pan-x" : "pan-y pinch-zoom",
              cursor: allImages.length > 1 ? "grab" : "default",
            }}>
            {/* Image Container with swipe animation - Mobile swipe carousel */}
            <div
              className="w-full h-full flex transition-transform duration-300 ease-out md:hidden"
              style={{
                transform: `translateX(-${selectedImageIndex * 100}%)`,
              }}>
              {allImages.map((image: string, index: number) => (
                <div
                  key={index}
                  className="w-full h-full flex-shrink-0 flex items-center justify-center relative"
                  style={{ minWidth: "100%" }}>
                  {image ? (
                    <img
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-6xl">
                      {(product.name || product.productName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: Single image display */}
            <div className="hidden md:flex w-full h-full items-center justify-center">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400 text-6xl">
                  {(product.name || product.productName || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Image Gallery Navigation - Only show if multiple images */}
            {allImages.length > 1 && (
              <>
                {/* Previous Image Button - Desktop only */}
                {selectedImageIndex > 0 && (
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setSelectedImageIndex(selectedImageIndex - 1);
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full items-center justify-center shadow-md hover:bg-white transition-colors z-10"
                    aria-label="Previous image">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {/* Next Image Button - Desktop only */}
                {selectedImageIndex < allImages.length - 1 && (
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setSelectedImageIndex(selectedImageIndex + 1);
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full items-center justify-center shadow-md hover:bg-white transition-colors z-10"
                    aria-label="Next image">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {/* Image Indicators - Show on both mobile and desktop */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {allImages.map((_: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIsTransitioning(true);
                        setSelectedImageIndex(index);
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${index === selectedImageIndex
                          ? "bg-violet-600 w-6"
                          : "bg-white/50 hover:bg-white/75"
                        }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Gallery - Show below main image if multiple images */}
          {allImages.length > 1 && (
            <div className="px-4 py-2 bg-white/50 backdrop-blur-sm mb-4">
              {/* Mobile swipe hint */}
              <div className="md:hidden flex items-center justify-center gap-1 mb-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-neutral-500">
                  <path
                    d="M7 12l5-5M17 12l-5-5M12 7l-5 5M12 17l5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-neutral-500">
                  Swipe to view more
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 scroll-smooth">
                {allImages.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsTransitioning(true);
                      setSelectedImageIndex(index);
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${index === selectedImageIndex
                        ? "border-violet-600 ring-2 ring-violet-200"
                        : "border-neutral-200 hover:border-neutral-300"
                      }`}>
                    <img
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

          {/* Right Column - Product Details & Extras */}
          <div className="md:w-[55%] lg:w-[58%] flex flex-col flex-1 relative z-10 w-full min-w-0">
            {/* Product Details Section - More compact */}
            <div className="bg-white rounded-t-3xl md:rounded-[2rem] -mt-6 md:mt-0 relative z-30 px-3 md:px-6 pt-3 md:pt-5 pb-3 md:pb-5 md:shadow-sm md:border md:border-neutral-100 md:mb-4">
              
              {/* Brand Name */}
              {product.brand && (
                <div className="text-[9px] md:text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-0.5 opacity-80">
                  {typeof product.brand === 'object' ? product.brand.name : product.brand}
                </div>
              )}

              {/* Product Name */}
              <h1 className="text-lg md:text-xl font-bold text-neutral-900 mb-1 leading-tight">
                {product.name}
              </h1>

              {/* Pricing Section - Compact single line */}
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="text-xl font-bold text-neutral-900">
                  ₹{variantPrice.toLocaleString("en-IN")}
                </span>
                
                {hasDiscount && (
                  <>
                    <span className="text-sm text-neutral-400 line-through decoration-neutral-300">
                      ₹{variantMrp.toLocaleString("en-IN")}
                    </span>
                    <div className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md flex items-center">
                      <span className="text-[10px] font-bold">{discount}% OFF</span>
                    </div>
                  </>
                )}
              </div>

              {/* Variant Selection - Compact */}
              {colors.length > 0 && colors[0] !== "Default" && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-neutral-700">
                      Color: <span className="text-neutral-500 font-medium">{selectedColor}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {colors.map((color) => {
                      const firstVariantOfColor = colorGroups[color][0];
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedColor(color);
                            // If current size not available in new color, pick first available size
                            const firstSizeInNewColor = colorGroups[color][0]?.size;
                            if (firstSizeInNewColor && !colorGroups[color].find((v:any) => v.size === selectedSize)) {
                              setSelectedSize(firstSizeInNewColor);
                            }
                          }}
                          className={`flex-shrink-0 w-14 h-16 rounded-lg overflow-hidden border-2 transition-all p-0.5 ${
                            isSelected ? "border-pink-500 ring-2 ring-pink-50 bg-pink-50" : "border-neutral-100 bg-white"
                          }`}>
                          <div className="w-full h-full rounded-md overflow-hidden bg-neutral-100">
                             <img 
                               src={firstVariantOfColor.imageUrl || product.imageUrl} 
                               alt={color}
                               className="w-full h-full object-cover"
                             />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generic Variant Selection (Fallback for legacy data) */}
              {showGenericVariations && (
                <div className="mb-4 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">Select Option</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.map((variant: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariantIndex(index)}
                        className={`px-4 h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-all border-2 ${
                          selectedVariantIndex === index
                            ? "bg-pink-500 border-pink-500 text-white shadow-sm"
                            : variant.status === "Sold out" || variant.stock === 0
                              ? "bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed"
                              : "bg-white border-white text-neutral-700 hover:border-pink-200"
                        }`}>
                        {variant.title || variant.value || `Option ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection - Slimmer */}
              {(availableSizes.length > 0 || (colors.length > 1 && !showGenericVariations)) && (
                <div className="mb-4 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                      {availableSizes.length > 0 ? "Select Size" : "Select Color Option"}
                    </span>
                    {availableSizes.length > 0 && (
                      <button className="text-[9px] font-bold text-pink-500 uppercase border-b border-pink-200">Chart</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.length > 0 ? (
                      availableSizes.map((size: string) => {
                        const isSelected = selectedSize === size;
                        const variant = colorGroups[selectedColor]?.find((v: any) => v.size === size);
                        const isOutOfStock = variant?.status === "Sold out" || variant?.stock === 0;

                        return (
                          <button
                            key={size}
                            disabled={isOutOfStock}
                            onClick={() => setSelectedSize(size)}
                            className={`min-w-[40px] h-[40px] flex items-center justify-center rounded-lg text-xs font-bold transition-all border-2 ${
                              isSelected
                                ? "bg-pink-500 border-pink-500 text-white shadow-sm"
                                : isOutOfStock
                                  ? "bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed"
                                  : "bg-white border-white text-neutral-700 hover:border-pink-200"
                            }`}>
                            {size}
                          </button>
                        );
                      })
                    ) : (
                      // If no sizes but multiple colors, show color names in chips as fallback/addition
                      colorGroups[selectedColor]?.map((variant: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            const vIndex = product.variations.indexOf(variant);
                            if (vIndex !== -1) setSelectedVariantIndex(vIndex);
                          }}
                          className={`px-4 h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-all border-2 ${
                            selectedVariantIndex === product.variations.indexOf(variant)
                              ? "bg-pink-500 border-pink-500 text-white shadow-sm"
                              : variant.status === "Sold out" || variant.stock === 0
                                ? "bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed"
                                : "bg-white border-white text-neutral-700 hover:border-pink-200"
                          }`}>
                          {variant.title || variant.value || selectedColor}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Details Card - Dynamic & Small */}
              <div className="mb-4 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                <h3 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5">Delivery details</h3>
                
                {/* User Address */}
                <button 
                  onClick={() => navigate('/addresses')}
                  className="w-full flex items-start gap-2.5 mb-3.5 text-left group">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-tighter">
                         {user ? "DELIVER TO" : "SELECT ADDRESS"}
                       </span>
                       <ChevronRight className="text-neutral-300" size={16} />
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">
                       {isAddressLoading ? (
                         "Fetching your address..."
                       ) : user ? (
                         deliveredAddress ? (
                           `${deliveredAddress.address}, ${deliveredAddress.city}`
                         ) : (
                           "No address found. Click to add one."
                         )
                       ) : (
                         "Login to see your saved addresses"
                       )}
                    </p>
                  </div>
                </button>

                <div className="h-px bg-neutral-50 mb-3.5"></div>

                {/* Delivery Message */}
                <div className="flex items-center gap-2.5 mb-3.5">
                   <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                     <Truck size={16} />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-neutral-900">Blink and it’s there</p>
                     <p className="text-[11px] text-neutral-500 font-medium">— 24 minutes.</p>
                   </div>
                </div>

                {/* Fulfilled By - Dynamic Seller */}
                <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-lg">
                   <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-400">
                     <Package size={16} />
                   </div>
                   <div className="flex-1">
                     <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Fulfilled by</p>
                     <p className="text-xs font-bold text-neutral-900 leading-tight">
                        {product.seller?.storeName || "Premium Store"}
                        {product.seller?.city && <span className="text-[10px] text-neutral-400 font-medium ml-1">· {product.seller.city}</span>}
                     </p>
                   </div>
                </div>
              </div>

              {/* Product Highlights & Info - Direct access */}
              <div className="space-y-1.5 mb-4">
                {/* Highlights Section */}
                <div className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
                  <button
                    onClick={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-neutral-100/50 transition-colors">
                    <span className="text-[13px] font-bold text-neutral-800">
                      Highlights
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform text-neutral-400 ${isHighlightsExpanded ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isHighlightsExpanded && (
                    <div className="bg-white px-4 pb-3 pt-0.5">
                      <div className="space-y-1">
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex items-start">
                            <span className="text-[11px] font-bold text-neutral-400 w-24 flex-shrink-0 uppercase tracking-tight">Key Features</span>
                            <span className="text-[11px] text-neutral-700 font-medium">
                              {product.tags.map((tag: string, index: number) => (
                                <span key={tag}>
                                  {tag.replace(/-/g, " ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                  {index < (product.tags?.length || 0) - 1 ? ", " : ""}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start">
                          <span className="text-[11px] font-bold text-neutral-400 w-24 flex-shrink-0 uppercase tracking-tight">Source</span>
                          <span className="text-[11px] text-neutral-700 font-medium">{product.madeIn || "From India"}</span>
                        </div>
                        {category && (
                          <div className="flex items-start">
                            <span className="text-[11px] font-bold text-neutral-400 w-24 flex-shrink-0 uppercase tracking-tight">Category</span>
                            <span className="text-[11px] text-neutral-700 font-medium">{category.name}</span>
                          </div>
                        )}
                        {product.netQuantity && (
                          <div className="flex items-start">
                            <span className="text-[11px] font-bold text-neutral-400 w-24 flex-shrink-0 uppercase tracking-tight">Net Quantity</span>
                            <span className="text-[11px] text-neutral-700 font-medium">{product.netQuantity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
                  <button
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-neutral-100/50 transition-colors">
                    <span className="text-[13px] font-bold text-neutral-800">
                      Info
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform text-neutral-400 ${isInfoExpanded ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isInfoExpanded && (
                    <div className="bg-white px-4 pb-3 pt-0.5">
                       <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Cancellation Policy</span>
                          <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                            Product cannot be cancelled once the store has accepted the order.
                          </p>
                        </div>
                        
                        {product.manufacturer && (
                          <div className="flex flex-col gap-1 border-t border-neutral-50 pt-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Manufacturer Details</span>
                            <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">{product.manufacturer}</p>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-1 border-t border-neutral-50 pt-1.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">About Product</span>
                          <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                            {product.description || "No additional information available for this product."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

        {/* Expanded Product Details Section */}


        {/* Reviews Section - Content only */}
        <div className="bg-white px-4 md:px-6 lg:px-8 py-2">
          {reviews.length > 0 && (
             <h3 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider opacity-50">
               Customer Feedback
             </h3>
          )}

          {reviewsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="border-b border-neutral-50 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-semibold text-neutral-900">
                      {review.customer?.name || "Customer"}
                    </span>
                    <div className="flex items-center gap-1 bg-violet-100 px-2 py-0.5 rounded-full">
                      <span className="text-xs font-bold text-violet-700">
                        {review.rating}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-violet-700">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-1">
                    {review.comment}
                  </p>
                  <span className="text-xs text-neutral-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Top products in this category */}
        {similarProducts.length > 0 && (
          <div className="mt-6 mb-24">
            <div className="bg-neutral-100/50 border-t border-b border-neutral-200/50 py-4 px-3">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 px-1">
                Top products in this category
              </h3>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-1">
                {similarProducts.map((similarProduct) => (
                  <div
                    key={similarProduct.id || similarProduct._id}
                    className="flex-shrink-0 w-[130px] h-full"
                  >
                    <ProductCard 
                      product={similarProduct} 
                      categoryStyle={true}
                      showBadge={true}
                      showHeartIcon={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Sticky Footer - positioned above mobile nav */}
      {/* Sticky Footer - redesigned with gradient and shadow */}
      {/* Sticky Footer - redesigned with side-by-side pink buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-neutral-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 py-3">
        <div className="max-w-7xl mx-auto flex gap-3">
          {/* Add to cart / Quantity Stepper */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {inCartQty === 0 ? (
                <motion.div
                  key="add-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}>
                  <button
                    ref={addButtonRef}
                    onClick={handleAddToCart}
                    disabled={
                      !isAvailableAtLocation ||
                      (!isVariantAvailable && variantStock !== 0)
                    }
                    className={`w-full h-11 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-2 ${
                      !isAvailableAtLocation ||
                      (!isVariantAvailable && variantStock !== 0)
                        ? "bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed uppercase tracking-wider"
                        : "bg-white text-pink-500 border-pink-500 hover:bg-pink-50 active:scale-95 shadow-md shadow-pink-50"
                    }`}>
                    {!isAvailableAtLocation
                      ? "Unavailable"
                      : !isVariantAvailable && variantStock !== 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between bg-pink-500 text-white rounded-xl h-11 px-2 shadow-md shadow-pink-100">
                  <button
                    onClick={() => {
                      const productId = product.id || product._id;
                      const variantId = selectedVariant?._id;
                      updateQuantity(
                        productId,
                        inCartQty - 1,
                        variantId,
                        variantTitle
                      );
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <span className="text-lg font-bold">−</span>
                  </button>
                  <span className="text-base font-bold min-w-[1.2rem] text-center">
                    {inCartQty}
                  </span>
                  <button
                    onClick={() => {
                      const productId = product.id || product._id;
                      const variantId = selectedVariant?._id;
                      updateQuantity(
                        productId,
                        inCartQty + 1,
                        variantId,
                        variantTitle
                      );
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <span className="text-lg font-bold">+</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buy Now Button */}
          <button
            onClick={() => {
              if (inCartQty === 0) handleAddToCart();
              navigate('/checkout');
            }}
            disabled={!isVariantAvailable && variantStock !== 0}
            className="flex-1 h-11 bg-pink-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-pink-600 active:scale-95 transition-all shadow-md shadow-pink-100 disabled:opacity-50 disabled:cursor-not-allowed">
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
