import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLocation } from '../hooks/useLocation';
import { Cart, CartItem } from '../types/cart';
import { Product } from '../types/domain';
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/api/customerCartService';
import { calculateProductPrice } from '../utils/priceUtils';
import StoreMismatchModal from '../modules/user/components/StoreMismatchModal';

const CART_STORAGE_KEY = 'saved_cart';

interface AddToCartEvent {
  product: Product;
  sourcePosition?: { x: number; y: number };
}

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, sourceElement?: HTMLElement | null) => Promise<void>;
  removeFromCart: (productId: string, variantId?: string, variantTitle?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string, variantTitle?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: (latitude?: number, longitude?: number) => Promise<void>;
  lastAddEvent: AddToCartEvent | null;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Extended interface to include Cart Item ID
interface ExtendedCartItem extends CartItem {
  id?: string;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage for persistence on refresh
  const [items, setItems] = useState<ExtendedCartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out items with null/undefined products (corrupted localStorage data)
        return Array.isArray(parsed) ? parsed.filter((item: any) => item?.product) : [];
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
    return [];
  });
  const [lastAddEvent, setLastAddEvent] = useState<AddToCartEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [mismatchData, setMismatchData] = useState<{
    isOpen: boolean;
    product?: Product;
    existingStoreName?: string;
    newStoreName?: string;
  }>({ isOpen: false });
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  const { isAuthenticated, user } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast();

  // State for estimate delivery fee
  const [estimatedFee, setEstimatedFee] = useState<number | undefined>(undefined);
  const [platformFee, setPlatformFee] = useState<number | undefined>(undefined);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | undefined>(undefined);

  // Helper to map API cart items to internal CartItem structure
  const mapApiItemsToState = (apiItems: any[]): ExtendedCartItem[] => {
    return apiItems
      .filter((item: any) => item.product) // Safety filter
      .map((item: any) => ({
        id: item._id, // Store CartItem ID
        product: {
          id: item.product._id, // Map _id to id
          name: item.product.productName || item.product.name,
          price: item.product.price,
          mrp: item.product.mrp,
          discPrice: item.product.discPrice,
          variations: item.product.variations,
          imageUrl: item.product.mainImage || item.product.imageUrl,
          pack: item.product.pack || '1 unit',
          categoryId: item.product.category || '',
          description: item.product.description,
          variantId: item.variation // Preserving variation ID/value
        },
        quantity: item.quantity,
        variant: item.variation // Also preserve it here for order placement
      }));
  };

  // Sync to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Helper to sync cart from API
  const fetchCart = async (lat?: number, lng?: number) => {
    if (!isAuthenticated || user?.userType !== 'Customer') {
      setLoading(false);
      return;
    }

    try {
      const response = await getCart({
        latitude: lat ?? location?.latitude,
        longitude: lng ?? location?.longitude
      });
      if (response && response.data && response.data.items) {
        setItems(mapApiItemsToState(response.data.items));
        setEstimatedFee(response.data.estimatedDeliveryFee);
        setPlatformFee(response.data.platformFee);
        setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
      } else {
        setItems([]);
        setEstimatedFee(undefined);
        setPlatformFee(undefined);
        setFreeDeliveryThreshold(undefined);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async (latitude?: number, longitude?: number) => {
    setLoading(true); // Optional: Set loading state if you want to show spinner
    await fetchCart(latitude, longitude);
  };

  // Load cart on auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      // Guest cart is already in 'items' from localStorage if it existed
      setLoading(false);
    }
  }, [isAuthenticated, user?.userType, location?.latitude, location?.longitude]);

  const cart: Cart = useMemo(() => {
    // Filter out any items with null products before computing totals
    const validItems = items.filter(item => item?.product);
    const total = validItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(item.product, item.variant);
      return sum + displayPrice * (item.quantity || 0);
    }, 0);
    const itemCount = validItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return {
      items: validItems,
      total,
      itemCount,
      estimatedDeliveryFee: estimatedFee,
      platformFee,
      freeDeliveryThreshold
    };
  }, [items, estimatedFee, platformFee, freeDeliveryThreshold]);

  const addToCart = async (product: Product, sourceElement?: HTMLElement | null) => {
    // Get consistent product ID - MongoDB returns _id, frontend expects id
    const productId = product._id || product.id;

    // Prevent concurrent operations on the same product
    if (pendingOperationsRef.current.has(productId)) {
      return;
    }
    pendingOperationsRef.current.add(productId);

    // Normalize product to always have 'id' property for consistency
    const normalizedProduct: Product = {
      ...product,
      id: productId,
      name: product.name || product.productName || 'Product',
      imageUrl: product.imageUrl || product.mainImage,
    };

    // Optimistic Update
    // Get source position if element is provided
    let sourcePosition: { x: number; y: number } | undefined;
    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    setLastAddEvent({ product: normalizedProduct, sourcePosition });
    setTimeout(() => setLastAddEvent(null), 800);

    // Optimistically update state
    const previousItems = [...items];
    setItems((prevItems) => {
      // Filter out null products and find existing item
      const validItems = prevItems.filter(item => item?.product);

      // Check for variant ID or variant title if product has variants
      const variantId = (product as any).variantId || (product as any).selectedVariant?._id;
      const variantTitle = (product as any).variantTitle || (product as any).pack;

      // Find existing item - match by product ID and variant (if variant exists)
      const existingItem = validItems.find((item) => {
        const itemProductId = String(item.product.id || item.product._id);
        const targetProductId = String(productId);
        if (itemProductId !== targetProductId) return false;

        const itemProxy = item.product as any;
        const itemVariantId = String(itemProxy.variantId || itemProxy.selectedVariant?._id || "");
        const itemVariantTitle = String(itemProxy.variantTitle || itemProxy.pack || "");

        // If specific variant info is provided, try to match it
        const targetVariantId = String(variantId || "");
        const targetVariantTitle = String(variantTitle || "");

        if (targetVariantId || targetVariantTitle) {
          return (targetVariantId && itemVariantId === targetVariantId) ||
                 (targetVariantTitle && itemVariantTitle === targetVariantTitle);
        }

        // If no variant info provided (e.g. from ProductCard), match ANY item of this product
        return true;
      });

      if (existingItem) {
        return validItems.map((item) => {
          if (item !== existingItem) return item;
          return { ...item, quantity: item.quantity + 1 };
        });
      }
      return [...validItems, { product: normalizedProduct, quantity: 1 }];
    });

    // Only sync to API if user is authenticated
    if (isAuthenticated && user?.userType === 'Customer') {
      try {
        // Pass variation info to API if available
        const variation = (product as any).variantId || (product as any).selectedVariant?._id || (product as any).variantTitle || (product as any).pack;
        const response = await apiAddToCart(
          productId,
          1,
          variation,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          // Atomic update from server response
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error: any) {
        console.error("Add to cart failed", error);
        
        // Handle Store Mismatch
        if (error.response?.status === 409 && error.response?.data?.code === 'STORE_MISMATCH') {
          setMismatchData({
            isOpen: true,
            product: product,
            existingStoreName: error.response.data.existingStore,
            newStoreName: (product as any).seller?.storeName || (product as any).storeName || 'this store'
          });
          // Silent toast so user knows something happened
          showToast("Multiple store ordering restricted", 'info');
        } else {
          // Show error toast for other errors
          showToast(error.response?.data?.message || "Failed to add to cart", 'error');
        }
        
        // Revert on error
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(productId);
      }
    } else {
      // For unregistered users, the optimistic update is already saved to localStorage
      // For guest users, we could optionally implement store-mismatch logic here too
      // but usually guest cart is local-only initially.
      
      // Remove from pending operations immediately
      pendingOperationsRef.current.delete(productId);
    }
  };

  const handleConfirmClearAndAdd = async () => {
    if (!mismatchData.product) return;
    
    const productToAdd = mismatchData.product;
    setMismatchData({ isOpen: false });
    
    try {
      setLoading(true);
      await apiClearCart();
      setItems([]); // Clear local items
      await addToCart(productToAdd); // Add the new item
      showToast("Cart updated with new store items", 'success');
    } catch (err) {
      console.error("Failed to switch store", err);
      showToast("Failed to switch store. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: string, variantId?: string, variantTitle?: string) => {
    // Create a unique operation key
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);

    // Prevent concurrent operations on the same product/variant
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    // Find item matching product ID and variant
    const itemToRemove = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = String(item.product.id || item.product._id);
      const targetProductId = String(productId);
      if (itemProductId !== targetProductId) return false;

      const itemProxy = item.product as any;
      const targetVariantId = String(variantId || "");
      const targetVariantTitle = String(variantTitle || "");

      if (targetVariantId || targetVariantTitle) {
        const itemVariantId = String(itemProxy.variantId || itemProxy.selectedVariant?._id || "");
        const itemVariantTitle = String(itemProxy.variantTitle || itemProxy.pack || "");
        return (targetVariantId && itemVariantId === targetVariantId) ||
               (targetVariantTitle && itemVariantTitle === targetVariantTitle);
      }
      return true;
    });

    if (!itemToRemove) {
      pendingOperationsRef.current.delete(operationKey);
      return;
    }

    const previousItems = [...items];
    setItems((prevItems) => prevItems.filter((item) => item !== itemToRemove));

    // Only sync to API if user is authenticated and item has CartItemID
    if (isAuthenticated && user?.userType === 'Customer' && itemToRemove?.id) {
      try {
        const response = await apiRemoveFromCart(
          itemToRemove.id,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error) {
        console.error("Remove from cart failed", error);
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      // For unregistered users, remove from pending operations immediately
      pendingOperationsRef.current.delete(operationKey);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string, variantTitle?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId, variantTitle);
      return;
    }

    // Create a unique operation key for this product/variant combination
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);

    // Prevent concurrent operations on the same product
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    // Find item matching product ID and variant (if variant info provided)
    const itemToUpdate = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = String(item.product.id || item.product._id);
      const targetProductId = String(productId);
      if (itemProductId !== targetProductId) return false;

      const itemProxy = item.product as any;
      const targetVariantId = String(variantId || "");
      const targetVariantTitle = String(variantTitle || "");

      // If variant info provided, match by variant
      if (targetVariantId || targetVariantTitle) {
        const itemVariantId = String(itemProxy.variantId || itemProxy.selectedVariant?._id || "");
        const itemVariantTitle = String(itemProxy.variantTitle || itemProxy.pack || "");
        return (targetVariantId && itemVariantId === targetVariantId) ||
               (targetVariantTitle && itemVariantTitle === targetVariantTitle);
      }

      // If no variant info, match ANY item of this product (ProductCard usage)
      return true;
    });

    const previousItems = [...items];
    setItems((prevItems) =>
      prevItems.filter(item => item?.product).map((item) => {
        if (!itemToUpdate) return item;
        
        // Match using the object found in the CLOSURE of the find call, 
        // fallback to ID matching if needed for extra robustness
        const isTarget = item === itemToUpdate || (
          String(item.product.id || item.product._id) === String(productId) &&
          (!variantId || String((item.product as any).variantId) === String(variantId))
        );

        if (isTarget) {
          return { ...item, quantity };
        }
        return item;
      })
    );

    // Only sync to API if user is authenticated and item has CartItemID
    if (isAuthenticated && user?.userType === 'Customer' && itemToUpdate?.id) {
      try {
        const response = await apiUpdateCartItem(
          itemToUpdate.id,
          quantity,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error) {
        console.error("Update quantity failed", error);
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      // For unregistered users, remove from pending operations immediately
      pendingOperationsRef.current.delete(operationKey);
    }
  };


  const clearCart = async () => {
    setItems([]);
    try {
      await apiClearCart();
    } catch (error) {
      console.error("Clear cart failed", error);
      await fetchCart();
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, lastAddEvent, loading }}
    >
      {children}
      <StoreMismatchModal 
        isOpen={mismatchData.isOpen}
        onClose={() => setMismatchData({ isOpen: false })}
        onConfirm={handleConfirmClearAndAdd}
        existingStoreName={mismatchData.existingStoreName}
        newStoreName={mismatchData.newStoreName}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


