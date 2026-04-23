import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../hooks/useOrders";
import { useLocation as useLocationContext } from "../../hooks/useLocation";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import RazorpayCheckout from "../../components/RazorpayCheckout";

// import { products } from '../../data/products'; // Removed
import { OrderAddress, Order } from "../../types/order";
import PartyPopper from "./components/PartyPopper";
import ProductCard from "./components/ProductCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../../components/ui/sheet";
import WishlistButton from "../../components/WishlistButton";

import {
  getCoupons,
  validateCoupon,
  Coupon as ApiCoupon,
} from "../../services/api/customerCouponService";
import { appConfig } from "../../services/configService";
import {
  getAddresses,
  updateAddress,
} from "../../services/api/customerAddressService";
import GoogleMapsLocationPicker from "../../components/GoogleMapsLocationPicker";
import { getProducts } from "../../services/api/customerProductService";
import { addToWishlist } from "../../services/api/customerWishlistService";
import { updateProfile } from "../../services/api/customerService";
import { calculateProductPrice } from "../../utils/priceUtils";

// const STORAGE_KEY = 'saved_address'; // Removed

// Similar products helper removed - using API

export default function Checkout() {
  const {
    cart,
    updateQuantity,
    clearCart,
    addToCart,
    removeFromCart,
    refreshCart,
    loading: cartLoading,
  } = useCart();
  const { addOrder } = useOrders();
  const { location: userLocation } = useLocationContext();
  const { showToast: showGlobalToast } = useToast();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem;

  const [savedAddresses, setSavedAddresses] = useState<OrderAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<OrderAddress | null>(
    null
  );

  // Recalculate delivery charges when address changes
  useEffect(() => {
    if (selectedAddress?.latitude && selectedAddress?.longitude) {
      refreshCart(selectedAddress.latitude, selectedAddress.longitude);
    }
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<ApiCoupon | null>(null);
  const [showPartyPopper, setShowPartyPopper] = useState(false);
  const [hasAppliedCouponBefore, setHasAppliedCouponBefore] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<ApiCoupon[]>([]);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatedDiscount, setValidatedDiscount] = useState<number>(0);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Online">("Online");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    address?: any;
  } | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isMapSelected, setIsMapSelected] = useState(false);

  // Check if user has placeholder data (needs profile completion)
  const isPlaceholderUser =
    user?.name === "User" || user?.email?.endsWith("@vrushahi.temp");

  // Redirect if empty
  useEffect(() => {
    if (!cartLoading && cart.items.length === 0 && !buyNowItem && !showOrderSuccess) {
      navigate("/");
    }
  }, [cart.items.length, cartLoading, buyNowItem, navigate, showOrderSuccess]);

  // Load addresses and coupons
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [addressResponse, couponResponse] = await Promise.all([
          getAddresses(),
          getCoupons(),
        ]);

        if (
          addressResponse.success &&
          Array.isArray(addressResponse.data) &&
          addressResponse.data.length > 0
        ) {
          const mappedAddresses: OrderAddress[] = addressResponse.data.map((addr: any) => ({
            name: addr.fullName,
            phone: addr.phone,
            flat: addr.address?.split(', ')[0] || '',
            street: addr.address || '',
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            landmark: addr.landmark || "",
            latitude: addr.latitude,
            longitude: addr.longitude,
            id: addr._id,
            _id: addr._id,
            type: addr.type
          }));
          setSavedAddresses(mappedAddresses);
          
          // Select default or first
          const defaultAddr = mappedAddresses.find((a: any) => a.isDefault) || mappedAddresses[0];
          setSelectedAddress(defaultAddr);
        }

        if (couponResponse.success) {
          setAvailableCoupons(couponResponse.data);
        }
      } catch (error) {
        console.error("Error loading checkout data:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch similar products dynamically
  useEffect(() => {
    const fetchSimilar = async () => {
      const items = (cart?.items || []).filter((item) => item && item.product);
      if (items.length === 0) return;

      const cartItem = items[0];
      try {
        let response;
        if (cartItem && cartItem.product) {
          // Try to fetch by category of the first item
          let catId = "";
          const product = cartItem.product;

          if (product.categoryId) {
            catId =
              typeof product.categoryId === "string"
                ? product.categoryId
                : (product.categoryId as any)._id ||
                (product.categoryId as any).id;
          }

          if (catId) {
            response = await getProducts({ category: catId, limit: 10 });
          } else {
            response = await getProducts({ limit: 10, sort: "popular" });
          }
        } else {
          response = await getProducts({ limit: 10, sort: "popular" });
        }

        if (response && response.data) {
          // Filter out items already in cart
          const itemsInCartIds = new Set(
            (cart?.items || [])
              .map((i) => i.product?.id || i.product?._id)
              .filter(Boolean)
          );
          const filtered = response.data
            .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
            .map((p: any) => {
              const { displayPrice, mrp } = calculateProductPrice(p);
              return {
                ...p,
                id: p._id || p.id,
                name: p.productName || p.name || "Product",
                imageUrl: p.mainImage || p.imageUrl || p.mainImageUrl || "",
                price: displayPrice,
                mrp: mrp,
                pack:
                  p.pack ||
                  p.variations?.[0]?.title ||
                  p.variations?.[0]?.name ||
                  "Standard",
              };
            })
            .slice(0, 6);
          setSimilarProducts(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch similar products", err);
      }
    };
    fetchSimilar();
  }, [cart?.items?.length]);

  if (cartLoading || ((cart?.items?.length || 0) === 0 && !buyNowItem && !showOrderSuccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-neutral-600">
            {cartLoading ? "Loading checkout..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  const displayItems = buyNowItem 
    ? [buyNowItem]
    : (cart?.items || []).filter((item) => item && item.product);

  const displayCart = {
    ...cart,
    items: displayItems,
    itemCount: displayItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    ),
    total: displayItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(
        item.product,
        item.variant
      );
      return sum + displayPrice * (item.quantity || 0);
    }, 0),
  };

  const threshold = cart.freeDeliveryThreshold ?? appConfig.freeDeliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(
    0,
    threshold - (displayCart.total || 0)
  );
  const cartItem = displayItems[0];

  const itemsTotal = displayItems.reduce((sum, item) => {
    if (!item?.product) return sum;
    const { mrp } = calculateProductPrice(item.product, item.variant);
    return sum + mrp * (item.quantity || 0);
  }, 0);

  const discountedTotal = displayCart.total;
  const savedAmount = itemsTotal - discountedTotal;
  const handlingCharge = buyNowItem 
    ? appConfig.platformFee 
    : (cart.platformFee ?? appConfig.platformFee);

  const deliveryCharge = buyNowItem
    ? (displayCart.total >= threshold ? 0 : appConfig.deliveryFee)
    : (cart.estimatedDeliveryFee ?? (displayCart.total >= threshold ? 0 : appConfig.deliveryFee));

  // Recalculate or use validated discount
  // If we have a selected coupon, we should re-validate if cart total changes,
  // but for simplicity, we'll re-calculate locally if possible or trust the previous validation if acceptable (better to re-validate)
  const subtotalBeforeCoupon =
    discountedTotal + handlingCharge + deliveryCharge;

  // Local calculation for immediate feedback, relying on backend validation on Apply
  let currentCouponDiscount = 0;
  if (selectedCoupon) {
    // Logic mirrors backend for UI update purposes
    if (
      selectedCoupon.minOrderValue &&
      subtotalBeforeCoupon < selectedCoupon.minOrderValue
    ) {
      // Invalid now
    } else {
      if (selectedCoupon.discountType === "Percentage") {
        currentCouponDiscount = Math.round(
          (subtotalBeforeCoupon * selectedCoupon.discountValue) / 100
        );
        if (
          selectedCoupon.maxDiscountAmount &&
          currentCouponDiscount > selectedCoupon.maxDiscountAmount
        ) {
          currentCouponDiscount = selectedCoupon.maxDiscountAmount;
        }
      } else {
        currentCouponDiscount = selectedCoupon.discountValue;
      }
    }
  }

  // Calculate tip amount (use custom tip if custom tip input is shown, otherwise use selected tip)
  const finalTipAmount = 0;
  const giftPackagingFee = 0;
  const grandTotal = Math.max(
    0,
    discountedTotal +
    handlingCharge +
    deliveryCharge +
    finalTipAmount +
    giftPackagingFee -
    currentCouponDiscount
  );

  const handleApplyCoupon = async (coupon: ApiCoupon) => {
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(coupon.code, subtotalBeforeCoupon);
      if (result.success && result.data?.isValid) {
        const isFirstTime = !hasAppliedCouponBefore;
        setSelectedCoupon(coupon);
        setValidatedDiscount(result.data.discountAmount);
        setShowCouponSheet(false);
        if (isFirstTime) {
          setHasAppliedCouponBefore(true);
          setShowPartyPopper(true);
        }
      } else {
        setCouponError(result.message || "Invalid coupon");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Failed to apply coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setValidatedDiscount(0);
    setCouponError(null);
  };

  const handleMoveToWishlist = async (product: any, variantId?: string, variantTitle?: string) => {
    if (!product?.id && !product?._id) return;

    const productId = product.id || product._id;

    try {
      if (!userLocation?.latitude || !userLocation?.longitude) {
        showGlobalToast(
          "Location is required to move items to wishlist",
          "error"
        );
        return;
      }

      // Add to wishlist
      await addToWishlist(
        productId,
        userLocation.latitude,
        userLocation.longitude
      );
      // Remove from cart
      await removeFromCart(productId, variantId, variantTitle);
      // Show success message
      showGlobalToast("Item moved to wishlist");
    } catch (error: any) {
      console.error("Failed to move to wishlist:", error);
      const msg =
        error.response?.data?.message || "Failed to move item to wishlist";
      showGlobalToast(msg, "error");
    }
  };

  const handlePlaceOrder = async (arg?: any) => {
    // Only bypass if explicitly passed true (handles event objects from onClick)
    const bypassProfileCheck = arg === true;

    if (!selectedAddress || displayItems.length === 0) {
      return;
    }

    // Check if user needs to complete their profile first
    if (!bypassProfileCheck && isPlaceholderUser) {
      setProfileFormData({
        name: user?.name === "User" ? "" : user?.name || "",
        email: user?.email?.endsWith("@vrushahi.temp") ? "" : user?.email || "",
      });
      setShowProfileModal(true);
      return;
    }

    // Validate required address fields
    if (!selectedAddress.city || !selectedAddress.pincode) {
      console.error("Address is missing required fields (city or pincode)");
      alert("Please ensure your address has city and pincode.");
      return;
    }

    // Use user's current location as fallback if address doesn't have coordinates
    const finalLatitude = selectedAddress.latitude ?? userLocation?.latitude;
    const finalLongitude = selectedAddress.longitude ?? userLocation?.longitude;

    // Validate that we have location data (either from address or user's current location)
    if (finalLatitude == null || finalLongitude == null) {
      console.error(
        "Address is missing location data (latitude/longitude) and user location is not available"
      );
      alert(
        "Location is required for delivery. Please ensure your address has location data or enable location access."
      );
      return;
    }

    // Create address object with location data (use fallback if needed)
    const addressWithLocation: OrderAddress = {
      ...selectedAddress,
      latitude: finalLatitude,
      longitude: finalLongitude,
    };

    const orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    const order: Order = {
      id: orderId,
      items: displayItems,
      totalItems: displayItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      subtotal: discountedTotal,
      fees: {
        platformFee: handlingCharge,
        deliveryFee: deliveryCharge,
      },
      totalAmount: grandTotal,
      address: addressWithLocation,
      paymentMethod: paymentMethod,
      status: "Placed",
      createdAt: new Date().toISOString(),
      couponCode: selectedCoupon?.code || undefined,
    };

    try {
      const placedId = await addOrder(order);
      if (placedId) {
        if (paymentMethod === "Online") {
          setPendingOrderId(placedId);
          setShowRazorpayCheckout(true);
        } else {
          setPlacedOrderId(placedId);
          if (!buyNowItem) clearCart();
          setShowOrderSuccess(true);
        }
      }
    } catch (error: any) {
      console.error("Order placement failed", error);
      // Show user-friendly error message
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to place order. Please try again.";
      alert(errorMessage);
    }
  };

  const handleGoToOrders = () => {
    if (placedOrderId) {
      navigate(`/orders/${placedOrderId}`);
    } else {
      navigate("/orders");
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedAddress?.id || !mapLocation) return;
    setIsUpdatingLocation(true);
    try {
      // Prepare update payload
      const updatePayload: any = {
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
      };

      // If address details are available from map, update them too
      if (mapLocation.address) {
        if (mapLocation.address.street)
          updatePayload.address = mapLocation.address.street;
        if (mapLocation.address.city)
          updatePayload.city = mapLocation.address.city;
        if (mapLocation.address.state)
          updatePayload.state = mapLocation.address.state;
        if (mapLocation.address.pincode)
          updatePayload.pincode = mapLocation.address.pincode;
        if (mapLocation.address.landmark)
          updatePayload.landmark = mapLocation.address.landmark;
      }

      // Update the address in backend
      await updateAddress(selectedAddress.id, updatePayload);

      // Update local state
      const updated = {
        ...selectedAddress,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        street: mapLocation.address?.street || selectedAddress.street,
        city: mapLocation.address?.city || selectedAddress.city,
        state: mapLocation.address?.state || selectedAddress.state,
        pincode: mapLocation.address?.pincode || selectedAddress.pincode,
        landmark: mapLocation.address?.landmark || selectedAddress.landmark,
      };
      setSelectedAddress(updated);
      setSavedAddresses(prev => prev.map(a => a.id === updated.id ? updated : a)); // Sync
      setShowMapPicker(false);
      setIsMapSelected(true); // Mark map as selected
      showGlobalToast("Location and address updated successfully!");
    } catch (err) {
      console.error(err);
      // showGlobalToast('Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Handle profile completion submission
  const handleProfileSubmit = async () => {
    if (!profileFormData.name.trim() || !profileFormData.email.trim()) {
      setProfileError("Please enter both name and email");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileFormData.email)) {
      setProfileError("Please enter a valid email address");
      return;
    }

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const response = await updateProfile({
        name: profileFormData.name.trim(),
        email: profileFormData.email.trim(),
      });

      if (response.success) {
        // Update local user data
        updateUser({
          ...user,
          id: user?.id || "",
          name: response.data.name,
          email: response.data.email,
        });

        setShowProfileModal(false);
        showGlobalToast("Profile updated successfully!");

        // Directly trigger order placement, bypassing the profile check
        handlePlaceOrder(true);
      }
    } catch (error: any) {
      setProfileError(
        error.response?.data?.message ||
        "Failed to update profile. Please try again."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div
      className="bg-white min-h-screen flex flex-col opacity-100 pb-32"
      style={{ opacity: 1 }}>
      {/* Party Popper Animation */}
      <PartyPopper
        show={showPartyPopper}
        onComplete={() => setShowPartyPopper(false)}
      />

      {/* Profile Completion Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-neutral-900 mb-2">
                Complete Your Profile
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Please provide your name and email to continue with your order.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileFormData.email}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter your email"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                {profileError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {profileError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                    disabled={isUpdatingProfile}>
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={
                      isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                    }
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg ${isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-[#ff3269] text-white hover:bg-[#ff1f5a] shadow-pink-100"
                      }`}>
                    {isUpdatingProfile ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMapPicker(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl overflow-hidden w-full max-w-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-neutral-900">
                  Pin Delivery Location
                </h3>
                <button onClick={() => setShowMapPicker(false)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <GoogleMapsLocationPicker
                initialLat={
                  mapLocation?.lat ||
                  userLocation?.latitude ||
                  selectedAddress?.latitude ||
                  0
                }
                initialLng={
                  mapLocation?.lng ||
                  userLocation?.longitude ||
                  selectedAddress?.longitude ||
                  0
                }
                onLocationSelect={(lat, lng, address) =>
                  setMapLocation({ lat, lng, address })
                }
                height="300px"
              />

              <div className="p-4 bg-white border-t">
                <p className="text-xs text-neutral-500 mb-3 text-center">
                  Move the map to set your exact delivery location
                </p>
                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                  className="w-full py-3 bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {isUpdatingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    "Confirm Location"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Celebration Page */}
      {showOrderSuccess && (
        <div
          className="fixed inset-0 z-[70] bg-white flex flex-col items-center justify-center h-screen w-screen overflow-hidden"
          style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* Confetti Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated confetti pieces */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  backgroundColor: [
                    "#ff3269",
                    "#8b5cf6",
                    "#cdbae0",
                    "#ff1f5a",
                    "#22c55e",
                    "#3b82f6",
                  ][Math.floor(Math.random() * 6)],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2
                    }s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Success Content */}
          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Success Tick Circle */}
            <div
              className="relative mb-8"
              style={{
                animation:
                  "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
              }}>
              {/* Outer ring animation */}
              <div
                className="absolute inset-0 w-32 h-32 rounded-full border-4 border-purple-500"
                style={{
                  animation: "ringPulse 1.5s ease-out infinite",
                  opacity: 0.3,
                }}
              />
              {/* Main circle */}
              <div className="w-32 h-32 bg-gradient-to-br from-[#cdbae0] to-[#8b5cf6] rounded-full flex items-center justify-center shadow-2xl">
                <svg
                  className="w-16 h-16 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "checkDraw 0.5s ease-out 0.5s both" }}>
                  <path d="M5 12l5 5L19 7" className="check-path" />
                </svg>
              </div>
              {/* Sparkles */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    animation: `sparkle 0.6s ease-out ${0.3 + i * 0.1}s both`,
                    transform: `rotate(${i * 60}deg) translateY(-80px)`,
                  }}
                />
              ))}
            </div>

            {/* Location Info */}
            <div
              className="text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.6s both" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 text-red-500">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAddress?.city || "Your Location"}
                </h2>
              </div>
              <p className="text-gray-500 text-base">
                {selectedAddress
                  ? `${selectedAddress.street}, ${selectedAddress.city}`
                  : "Delivery Address"}
              </p>
            </div>

            {/* Order Placed Message */}
            <div
              className="mt-12 text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.8s both" }}>
              <h3 className="text-3xl font-bold text-[#ff3269] mb-2 tracking-tight">
                Order Placed!
              </h3>
              <p className="text-gray-600">Your order is on the way</p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToOrders}
              className="mt-10 bg-[#ff3269] hover:bg-[#ff1f5a] text-white font-bold py-4 px-12 rounded-xl shadow-lg shadow-pink-100 transition-all hover:shadow-xl hover:scale-105"
              style={{ animation: "slideUp 0.5s ease-out 1s both" }}>
              Track Your Order
            </button>
          </div>
        </div>
      )}

{/* Header */ }
<header className="sticky top-0 z-[100] bg-white border-b border-neutral-100 px-4 py-2 flex items-center gap-3">
  <button
    onClick={() => navigate(-1)}
    className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
    aria-label="Go back">
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-900">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  </button>

  <h1 className="text-sm font-bold text-neutral-900 tracking-tight">
    Checkout
  </h1>
</header>

{/* Ordering for someone else */ }
<div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 bg-neutral-50 border-b border-neutral-200">
  <div className="flex items-center justify-between">
    <span className="text-xs text-neutral-700">
      Ordering for someone else?
    </span>
    <button
      onClick={() =>
        navigate("/checkout/address", {
          state: {
            editAddress: selectedAddress || (savedAddresses.length > 0 ? savedAddresses[0] : null),
          },
        })
      }
      className="text-xs text-[#b57edc] font-bold hover:text-[#9b51e0] transition-all">
      Add details
    </button>
  </div>
</div>

{/* Saved Address Section */ }
{
  savedAddresses.length > 0 && (
    <div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 border-b border-neutral-200">
      <div className="mb-3 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-semibold text-neutral-900 mb-0.5">
            Delivery Address
          </h3>
          <p className="text-[10px] text-neutral-600">
            Select one of your saved addresses
          </p>
        </div>
        <button
          onClick={() => navigate("/checkout/address", { state: { isNew: true } })}
          className="text-[#ff3269] font-black text-[10px] uppercase tracking-wider"
        >
          Add New
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            className={`border rounded-xl p-3 cursor-pointer transition-all relative ${selectedAddress?.id === addr.id && !isMapSelected
              ? "border-[#ff3269] bg-pink-50/30 ring-1 ring-[#ff3269]/10"
              : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            onClick={() => {
              setSelectedAddress(addr);
              setIsMapSelected(false);
            }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedAddress?.id === addr.id && !isMapSelected
                      ? "border-[#ff3269] bg-[#ff3269]"
                      : "border-neutral-300"
                      }`}>
                    {selectedAddress?.id === addr.id && !isMapSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-900 truncate">
                    {addr.name}
                  </span>
                  <span className="text-[8px] font-black bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {(addr as any).type || 'Home'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 font-medium mb-1">
                  📞 {addr.phone}
                </p>
                <p className="text-[10px] text-neutral-600 line-clamp-2 leading-relaxed">
                  {addr.flat ? `${addr.flat}, ` : ""}
                  {addr.street}
                  {addr.landmark ? `, Near ${addr.landmark}` : ""}
                  , {addr.city} - {addr.pincode}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/checkout/address", {
                    state: {
                      editAddress: addr,
                    },
                  });
                }}
                className="p-2 -mr-1 hover:bg-neutral-50 rounded-lg transition-colors group"
                title="Edit Address"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-[#ff3269]"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Set Location on Map Button */}
      <div className="mt-2.5">
        <button
          onClick={() => {
            // Prioritize current GPS location (matches homepage header), then saved address
            setMapLocation({
              lat: userLocation?.latitude || selectedAddress?.latitude || 0,
              lng:
                userLocation?.longitude || selectedAddress?.longitude || 0,
            });
            setShowMapPicker(true);
          }}
          className={`flex items-center gap-3 text-sm font-bold px-5 py-3 rounded-xl w-full justify-center transition-all ${isMapSelected
            ? "text-[#9b51e0] bg-purple-100 border-2 border-purple-100 shadow-sm"
            : "text-[#b57edc] hover:text-[#9b51e0] bg-[#f8f6ff] border-2 border-purple-100/50 hover:bg-purple-100 hover:border-purple-200"
            }`}>
          {isMapSelected ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {isMapSelected
            ? "Precise Location Selected"
            : selectedAddress?.latitude
              ? "Update Precise Location on Map"
              : "Set Exact Location on Map"}
        </button>
      </div>
    </div>
  )
}

{/* Main Product Card */ }
<div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 bg-white border-b border-neutral-200">
  <div className="bg-white rounded-lg border border-purple-100 p-2.5">
    {/* Delivery info */}
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
          <path
            d="M12 6v6l4 2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xs font-semibold text-neutral-900">
        Delivery in {appConfig.estimatedDeliveryTime}
      </span>
    </div>

    <p className="text-[10px] text-neutral-600 mb-2.5">
      Shipment of {displayCart.itemCount || 0}{" "}
      {(displayCart.itemCount || 0) === 1 ? "item" : "items"}
    </p>

    {/* Cart Items */}
    <div className="space-y-2.5">
      {displayItems
        .filter((item) => item.product)
        .map((item) => (
          <div
            key={item.product?.id || Math.random()}
            className="flex gap-2 p-2 rounded-xl bg-purple-50/20 border border-purple-100/30">
            {/* Product Image */}
            <div className="w-12 h-12 bg-neutral-100 rounded-lg flex-shrink-0 overflow-hidden">
              {item.product?.imageUrl ? (
                <img
                  src={item.product?.imageUrl}
                  alt={item.product?.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  {(item.product?.name || "").charAt(0)}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">
                  {item.product?.productName || item.product?.name}
                </h3>
              </div>
              <div className="text-[10px] text-neutral-500 mb-2">
                {item.variant ? (
                  typeof item.variant === 'object' ? (
                    (item.variant as any).title || (item.variant as any).name || (item.variant as any).value || "Standard"
                  ) : item.variant
                ) : item.product?.pack}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const { displayPrice, mrp, hasDiscount } =
                      calculateProductPrice(item.product, item.variant);
                    return (
                      <>
                        {hasDiscount && (
                          <span className="text-[10px] text-neutral-400 line-through font-medium">
                            ₹{mrp}
                          </span>
                        )}
                        <span className="text-sm font-bold text-neutral-900">
                          ₹{displayPrice}
                        </span>
                      </>
                    );
                  })()}
                </div>

                {/* Quantity Stepper - Refined Light Pink Style */}
                <div className="flex items-center bg-pink-50/50 border border-pink-100 rounded-lg h-8 shadow-sm overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                      const variantTitle = (item.product as any).variantTitle || item.product.pack;
                      updateQuantity(item.product?.id, item.quantity - 1, variantId, variantTitle);
                    }}
                    className="w-8 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-100 transition-colors font-bold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-neutral-700 text-xs font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                      const variantTitle = (item.product as any).variantTitle || item.product.pack;
                      updateQuantity(item.product?.id, item.quantity + 1, variantId, variantTitle);
                    }}
                    className="w-8 h-full flex items-center justify-center text-[#ff3269] hover:bg-pink-100 transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Move to Wishlist - Placed below Stepper */}
              <div className="flex justify-end mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                    const variantTitle = (item.product as any).variantTitle || item.product.pack;
                    handleMoveToWishlist(item.product, variantId, variantTitle);
                  }}
                  className="text-[10px] text-neutral-400 font-semibold hover:text-[#ff3269] transition-colors"
                >
                  Move to wishlist
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>

  {/* Get FREE delivery banner */ }
{
  deliveryCharge > 0 && (
    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center gap-2 mb-1.5">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5 13h14M5 13l4-4m-4 4l4 4"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="5" r="2" fill="#3b82f6" />
        </svg>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">
              Get FREE delivery
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 18l6-6-6-6"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[10px] text-blue-600 mt-0.5">
            Add products worth ₹{amountNeededForFreeDelivery.toLocaleString('en-IN')} more
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1 bg-blue-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{
            width: `${Math.min(
              100,
              ((199 - amountNeededForFreeDelivery) / 199) * 100
            )}%`,
          }}
        />
      </div>
    </div>
  )
}

{/* Coupon Section */ }
{
  selectedCoupon ? (
    <div className="px-4 py-1.5 border-b border-neutral-200">
      <div className="flex items-center justify-between bg-green-50 rounded-lg p-2 border border-green-200">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 6L9 17l-5-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-700 truncate">
              {selectedCoupon.code}
            </p>
            <p className="text-[10px] text-green-600 truncate">
              {selectedCoupon.title}
            </p>
          </div>
        </div>
        <button
          onClick={handleRemoveCoupon}
          className="text-xs text-green-600 font-medium ml-2 flex-shrink-0">
          Remove
        </button>
      </div>
    </div>
  ) : (
    <div className="px-4 py-1.5 flex justify-end border-b border-neutral-200">
      <button
        onClick={() => setShowCouponSheet(true)}
        className="text-xs text-neutral-600 flex items-center gap-1">
        See all coupons
        <svg
          width="12"
          height="12"
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
    </div>
  )
}

{/* Bill details */ }
<div className="px-4 md:px-6 lg:px-8 py-2.5 md:py-3 border-b border-neutral-200">
  <h2 className="text-base font-bold text-neutral-900 mb-2.5">
    Bill details
  </h2>

  <div className="space-y-2">
    {/* Items total */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-neutral-700">Items total</span>
        {savedAmount > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
            Saved ₹{savedAmount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {itemsTotal > discountedTotal && (
          <span className="text-xs text-neutral-500 line-through">
            ₹{itemsTotal}
          </span>
        )}
        <span className="text-xs font-medium text-neutral-900">
          ₹{discountedTotal}
        </span>
      </div>
    </div>

    {/* Handling charge */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        <span className="text-xs text-neutral-700">Handling charge</span>
      </div>
      <span className="text-xs font-medium text-neutral-900">
        ₹{handlingCharge}
      </span>
    </div>

    {/* Delivery charge */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
          <circle cx="18.5" cy="18.5" r="1.5" fill="currentColor" />
        </svg>
        <span className="text-xs text-neutral-700">Delivery charge</span>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={`text-xs font-medium ${deliveryCharge === 0 ? "text-green-600" : "text-neutral-900"
            }`}>
          {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
        </span>
        {deliveryCharge > 0 && (
          <span className="text-[10px] text-orange-600 mt-0.5">
            Shop for ₹{amountNeededForFreeDelivery} more to get FREE delivery
          </span>
        )}
      </div>
    </div>

    {/* Coupon discount */}
    {selectedCoupon && currentCouponDiscount > 0 && (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs text-neutral-700">
            Coupon discount
          </span>
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
            {selectedCoupon.code}
          </span>
        </div>
        <span className="text-xs font-medium text-green-600">
          -₹{currentCouponDiscount.toLocaleString("en-IN")}
        </span>
      </div>
    )}



    {/* Grand total */}
    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
      <span className="text-sm font-bold text-neutral-900">
        Grand total
      </span>
      <span className="text-sm font-bold text-neutral-900">
        ₹{Math.max(0, grandTotal)}
      </span>
    </div>
  </div>
</div>




      {/* You might also like Section */}
      {similarProducts && similarProducts.length > 0 && (
        <div className="px-0 py-4 bg-white border-b border-neutral-200">
          <div className="px-4 md:px-6 lg:px-8 mb-3">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
              You might also like
              <span className="text-pink-400 text-lg">❤️</span>
            </h2>
          </div>
          
          <div 
            className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-6 lg:px-8 pb-2"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {similarProducts.map((product) => (
              <div 
                key={product.id || product._id}
                className="flex-none basis-[140px] md:basis-[150px]"
                style={{ scrollSnapAlign: 'start' }}
              >
                <ProductCard
                  product={product}
                  categoryStyle={true}
                  compact={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}

{/* Cancellation Policy */ }
<div className="px-4 py-4 border-b border-neutral-100">
  <button
    onClick={() => setShowCancellationPolicy(true)}
    className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors group">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-400 group-hover:text-neutral-600">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    <span className="underline decoration-neutral-300 underline-offset-4">Review Cancellation Policy</span>
  </button>
</div>

{/* Made with love by vrushahi */ }
<div className="px-4 py-2">
  <div className="w-full flex flex-col items-center justify-center">
    <div className="flex items-center gap-1.5 text-neutral-500">
      <span className="text-[10px] font-medium">Made with</span>
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
        className="text-red-500 text-sm">
        ❤️
      </motion.span>
      <span className="text-[10px] font-medium">by</span>
      <span className="text-[10px] font-semibold text-[#b57edc]">
        vrushahi
      </span>
    </div>
  </div>
</div>


{/* Cancellation Policy Sheet Modal */ }
<Sheet
  open={showCancellationPolicy}
  onOpenChange={setShowCancellationPolicy}>
  <SheetContent side="bottom" className="max-h-[85vh]">
    <SheetHeader className="text-left">
      <div className="flex items-center justify-between mb-2">
        <SheetTitle className="text-base font-bold text-neutral-900">
          Cancellation Policy
        </SheetTitle>
        <SheetClose onClick={() => setShowCancellationPolicy(false)}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SheetClose>
      </div>
    </SheetHeader>

    <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-80px)]">
      <div className="space-y-4 mt-4 text-sm text-neutral-700">
        <div>
          <h3 className="font-bold text-neutral-900 mb-2">
            Order Cancellation
          </h3>
          <p className="mb-2">
            You can cancel your order before it is confirmed by the
            seller. Once confirmed, cancellation may not be possible.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-neutral-900 mb-2">
            Refund Policy
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Refunds will be processed within 5-7 business days</li>
            <li>
              Refund amount will be credited to your original payment
              method
            </li>
            <li>Delivery charges are non-refundable</li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-neutral-900 mb-2">
            Partial Cancellation
          </h3>
          <p>
            Partial cancellation of items in an order is not allowed. You
            can cancel the entire order or contact customer support for
            assistance.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-neutral-900 mb-2">
            Contact Support
          </h3>
          <p>
            For any cancellation requests or queries, please contact our
            customer support team
          </p>
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>

{/* Payment Method Selection */ }
<div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/50">
  <h3 className="text-sm font-bold text-neutral-900 mb-2">Payment Method</h3>
  <div className="space-y-2">
    {/* Online Payment Option */}
    <div
      onClick={() => setPaymentMethod("Online")}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "Online"
        ? "border-neutral-900 bg-neutral-50"
        : "border-neutral-200 bg-white"
        }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "Online" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
        }`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      </div>
      <div>
        <span className="text-xs font-bold block text-neutral-900">Online Payment</span>
        <span className="text-[10px] text-neutral-500">Secure payment via Razorpay</span>
      </div>
      {paymentMethod === "Online" && (
        <div className="ml-auto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>

    {/* COD Option */}
    <div
      onClick={() => setPaymentMethod("COD")}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "COD"
        ? "border-neutral-900 bg-neutral-50"
        : "border-neutral-200 bg-white"
        }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "COD" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
        }`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      </div>
      <div>
        <span className="text-xs font-bold block text-neutral-900">Cash on Delivery</span>
        <span className="text-[10px] text-neutral-500">Pay when you receive your order</span>
      </div>
      {paymentMethod === "COD" && (
        <div className="ml-auto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  </div>
</div>

{/* Coupon Sheet Modal */ }
<Sheet open={showCouponSheet} onOpenChange={setShowCouponSheet}>
  <SheetContent side="bottom" className="max-h-[85vh]">
    <SheetHeader className="text-left">
      <div className="flex items-center justify-between mb-2">
        <SheetTitle className="text-base font-bold text-neutral-900">
          Available Coupons
        </SheetTitle>
        <SheetClose onClick={() => setShowCouponSheet(false)}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SheetClose>
      </div>
    </SheetHeader>

    <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-80px)]">
      <div className="space-y-2.5 mt-2">
        {availableCoupons.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No coupons available at the moment.</p>
          </div>
        ) : (
          availableCoupons.map((coupon) => {
            const subtotalBeforeCoupon =
              discountedTotal + handlingCharge + deliveryCharge;
            const meetsMinOrder =
              !coupon.minOrderValue ||
              subtotalBeforeCoupon >= coupon.minOrderValue;
            const isSelected = selectedCoupon?._id === coupon._id;

            return (
              <div
                key={coupon._id}
                className={`border-2 rounded-lg p-2.5 transition-all ${isSelected
                  ? "border-[#ff3269] bg-pink-50"
                  : meetsMinOrder
                    ? "border-neutral-200 bg-white"
                    : "border-neutral-200 bg-neutral-50 opacity-60"
                  }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#ff3269]">
                        {coupon.code}
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        {coupon.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-600 mb-1">
                      {coupon.description}
                    </p>
                    {coupon.minOrderValue && (
                      <p className="text-[10px] text-neutral-500">
                        Min. order: ₹{coupon.minOrderValue}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-[#ff3269]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-xs font-bold">Applied</span>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        meetsMinOrder && handleApplyCoupon(coupon)
                      }
                      disabled={!meetsMinOrder || isValidatingCoupon}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${meetsMinOrder
                        ? "bg-[#ff3269] text-white hover:bg-[#ff1f5a]"
                        : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                        }`}>
                      {isValidatingCoupon ? "..." : "Apply"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </SheetContent>
</Sheet>

{/* Bottom Sticky Button */ }
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-[60] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
  {selectedAddress ? (
    <div className="p-3">
      <button
        onClick={handlePlaceOrder}
        disabled={displayItems.length === 0}
        className={`w-full py-3 px-4 font-bold text-base uppercase tracking-wider rounded-xl transition-all shadow-lg ${displayItems.length > 0
          ? "bg-[#ff3269] text-white hover:bg-[#ff1f5a] shadow-pink-100"
          : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
          }`}>
        Place Order
      </button>
    </div>
  ) : (
    <div className="p-3">
      <button
        onClick={() =>
          navigate("/checkout/address", {
            state: {
              editAddress: selectedAddress,
            },
          })
        }
        className="w-full bg-[#ff3269] text-white py-3 px-4 font-bold text-base uppercase tracking-wider rounded-xl hover:bg-[#ff1f5a] shadow-lg shadow-pink-100 transition-all">
        Choose address at next step
      </button>
    </div>
  )}
</div>

{/* Razorpay Checkout Modal */ }
{
  showRazorpayCheckout && pendingOrderId && user && (
    <RazorpayCheckout
      orderId={pendingOrderId}
      amount={grandTotal}
      customerDetails={{
        name: user.name || "Customer",
        email: user.email || "",
        phone: user.phone || "",
      }}
      onSuccess={(paymentId) => {
        setShowRazorpayCheckout(false);
        setPlacedOrderId(pendingOrderId);
        setPendingOrderId(null);
        clearCart();
        setShowOrderSuccess(true);
        showGlobalToast("Payment successful!", "success");
      }}
      onFailure={(error) => {
        setShowRazorpayCheckout(false);
        setPendingOrderId(null);
        showGlobalToast(error || "Payment failed. Please try again.", "error");
      }}
    />
  )
}
{/* Animation Styles */ }
<style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkDraw {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        @keyframes ringPulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateY(-80px) scale(1);
            opacity: 0;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        .check-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
        }
      `}</style>
    </div>
  );
}
