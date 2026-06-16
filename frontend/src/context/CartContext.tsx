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
  const needsSyncRef = useRef<Map<string, number>>(new Map()); // Maps productId -> latest requested quantity

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
      .map((item: any) => {
        // Resolve the full variant object from the stored variation identifier
        let resolvedVariant: any = null;
        let resolvedVariantTitle = '';
        if (item.variation && item.product.variations?.length > 0) {
          resolvedVariant = item.product.variations.find((v: any) =>
            v._id?.toString() === item.variation ||
            v.title === item.variation ||
            v.value === item.variation ||
            v.name === item.variation
          );
          if (resolvedVariant) {
            resolvedVariantTitle = resolvedVariant.title || resolvedVariant.value || resolvedVariant.name || '';
          }
        }

        return {
          id: item._id, // Store CartItem ID
          product: {
            id: item.product._id, // Map _id to id
            name: item.product.productName || item.product.name,
            price: resolvedVariant?.price || item.product.price,
            mrp: item.product.mrp,
            discPrice: resolvedVariant?.discPrice || item.product.discPrice,
            variations: item.product.variations,
            imageUrl: resolvedVariant?.image || item.product.mainImage || item.product.imageUrl || item.product.variations?.find((v: any) => !!v.image)?.image,
            pack: resolvedVariantTitle || item.product.pack || '1 unit',
            categoryId: item.product.category || '',
            description: item.product.description,
            variantId: item.variation, // Preserving variation ID/value
            variantTitle: resolvedVariantTitle || item.variation, // Resolved title for display
            selectedVariant: resolvedVariant, // Full variant object
            tax: item.product.tax, // Map tax object from API
            maxOrderLimit: item.product.maxOrderLimit // Preserve maxOrderLimit
          },
          quantity: item.quantity,
          variant: item.variation, // Also preserve it here for order placement
          isDeliverable: item.isDeliverable
        };
      });
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
    let totalTax = 0;
    const total = validItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(item.product, item.variant);
      const itemTotal = displayPrice * (item.quantity || 0);

      let itemTaxBreakdown = undefined;
      if ((item.product as any).tax && (item.product as any).tax.percentage) {
        const taxPercentage = (item.product as any).tax.percentage;
        const taxName = (item.product as any).tax.name || 'Tax';
        // Since price is inclusive of tax, extract the tax amount
        const itemTax = itemTotal - (itemTotal / (1 + (taxPercentage / 100)));
        totalTax += itemTax;

        itemTaxBreakdown = {
          taxName,
          taxPercentage,
          taxAmount: itemTax,
          basePrice: itemTotal - itemTax
        };
      }

      // We attach it to the item locally
      item.taxBreakdown = itemTaxBreakdown;

      return sum + itemTotal;
    }, 0);
    const itemCount = validItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return {
      items: validItems,
      total,
      totalBasePrice: total - totalTax,
      totalTax,
      itemCount,
      estimatedDeliveryFee: estimatedFee,
      platformFee,
      freeDeliveryThreshold
    };
  }, [items, estimatedFee, platformFee, freeDeliveryThreshold]);

  const addToCart = async (product: Product, sourceElement?: HTMLElement | null) => {
    // Get consistent product ID - MongoDB returns _id, frontend expects id
    const productId = product._id || product.id;

    // If product has variations but no variant was selected, default to the first one
    let targetVariantId = (product as any).variantId || (product as any).selectedVariant?._id;
    let targetVariantTitle = (product as any).variantTitle || (product as any).pack;
    let selectedVariant = (product as any).selectedVariant;
    
    if (!targetVariantId && product.variations && product.variations.length > 0) {
      selectedVariant = product.variations[0];
      targetVariantId = (selectedVariant as any)._id;
      targetVariantTitle = (selectedVariant as any).title || (selectedVariant as any).name || (selectedVariant as any).value || product.pack || "Standard";
    }

    // Normalize product to always have 'id' property for consistency
    const normalizedProduct: Product = {
      ...product,
      id: productId,
      name: product.name || product.productName || 'Product',
      imageUrl: product.imageUrl || product.mainImage || product.variations?.find((v: any) => !!v.image)?.image,
      variantId: targetVariantId,
      selectedVariant: selectedVariant,
      variantTitle: targetVariantTitle,
      maxOrderLimit: product.maxOrderLimit,
    } as any;

    // Check max order limit before proceeding
    const existingItemForLimitCheck = items.find((item) => {
      if (!item?.product) return false;
      const itemProductId = String(item.product.id || item.product._id);
      if (itemProductId !== String(productId)) return false;
      const itemProxy = item.product as any;
      const targetVarId = String(targetVariantId || "");
      const targetVarTitle = String(targetVariantTitle || "");
      if (targetVarId || targetVarTitle) {
        const itemVariantId = String(itemProxy.variantId || itemProxy.selectedVariant?._id || "");
        const itemVariantTitle = String(itemProxy.variantTitle || itemProxy.pack || "");
        return (targetVarId && itemVariantId === targetVarId) ||
               (targetVarTitle && itemVariantTitle === targetVarTitle);
      }
      return true;
    });

    if (existingItemForLimitCheck && product.maxOrderLimit && existingItemForLimitCheck.quantity >= product.maxOrderLimit) {
      showToast(`Maximum order limit of ${product.maxOrderLimit} reached for this item`, 'error');
      return;
    }

    // Trigger fly-to-cart animation
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

    // Optimistically update state IMMEDIATELY to keep UI responsive
    const previousItems = [...items];
    setItems((prevItems) => {
      const validItems = prevItems.filter(item => item?.product);
      
      const variantId = targetVariantId;
      const variantTitle = targetVariantTitle;

      const existingItem = validItems.find((item) => {
        const itemProductId = String(item.product.id || item.product._id);
        if (itemProductId !== String(productId)) return false;
        const itemProxy = item.product as any;
        const targetVarId = String(variantId || "");
        const targetVarTitle = String(variantTitle || "");
        if (targetVarId || targetVarTitle) {
          const itemVariantId = String(itemProxy.variantId || itemProxy.selectedVariant?._id || "");
          const itemVariantTitle = String(itemProxy.variantTitle || itemProxy.pack || "");
          return (targetVarId && itemVariantId === targetVarId) ||
                 (targetVarTitle && itemVariantTitle === targetVarTitle);
        }
        return true;
      });

      if (existingItem) {
        return validItems.map((item) => 
          item === existingItem ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...validItems, { product: normalizedProduct, quantity: 1, variant: variantTitle || variantId }];
    });

    // Prevent concurrent API operations on the same product
    if (pendingOperationsRef.current.has(productId)) {
      // Mark that we need to sync the latest quantity once current op finishes
      const currentQty = items.find(i => String(i.product.id || i.product._id) === String(productId))?.quantity || 0;
      needsSyncRef.current.set(String(productId), currentQty + 1);
      return;
    }
    pendingOperationsRef.current.add(productId);

    // Only sync to API if user is authenticated
    if (isAuthenticated && user?.userType === 'Customer') {
      const performSync = async () => {
        try {
          // Pass variation info to API if available
          const variation = targetVariantId || targetVariantTitle;
          const response = await apiAddToCart(
            productId,
            1,
            variation,
            location?.latitude,
            location?.longitude
          );
          if (response && response.data && response.data.items) {
            const apiItems = mapApiItemsToState(response.data.items);
            setItems(prevItems => {
              // Smart merge: Preserve local quantities if they are higher than what API just returned
              return apiItems.map(apiItem => {
                const localItem = prevItems.find(p => 
                  String(p.product.id || p.product._id) === String(apiItem.product.id || apiItem.product._id)
                );
                if (localItem && localItem.quantity > apiItem.quantity) {
                  return { ...apiItem, quantity: localItem.quantity };
                }
                return apiItem;
              });
            });
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
            showToast("Multiple store ordering restricted", 'info');
          } else {
            showToast(error.response?.data?.message || "Failed to add to cart", 'error');
            setItems(previousItems);
          }
        } finally {
          pendingOperationsRef.current.delete(productId);
          
          // If we had more clicks while this one was pending, sync the FINAL quantity now
          if (needsSyncRef.current.has(String(productId))) {
            const finalQty = needsSyncRef.current.get(String(productId))!;
            needsSyncRef.current.delete(String(productId));
            updateQuantity(String(productId), finalQty);
          }
        }
      };

      performSync();
    } else {
      // For guest users, just clean up
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

    // Find the item to check maxOrderLimit before doing anything
    const itemToUpdate = items.find(item => {
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

    if (itemToUpdate) {
      if (itemToUpdate.product.maxOrderLimit && quantity > itemToUpdate.product.maxOrderLimit) {
        showToast(`Maximum order limit of ${itemToUpdate.product.maxOrderLimit} reached for this item`, 'error');
        return;
      }

      let availableStock = itemToUpdate.product.stock;
      const productVariations = itemToUpdate.product.variations || [];
      const itemProxy = itemToUpdate.product as any;
      const targetVariantId = String(variantId || itemProxy.variantId || itemProxy.selectedVariant?._id || itemToUpdate.variant || "");
      const targetVariantTitle = String(variantTitle || itemProxy.variantTitle || itemProxy.pack || "");
      
      let matchedVariant = null;
      if (productVariations.length > 0 && (targetVariantId || targetVariantTitle)) {
          matchedVariant = productVariations.find((v: any) => 
            String(v._id) === targetVariantId || String(v.value || v.title || v.name || v.pack) === targetVariantTitle
          );
      } else if (itemProxy.selectedVariant) {
          matchedVariant = itemProxy.selectedVariant;
      }
      
      if (matchedVariant && typeof matchedVariant.stock === 'number') {
          availableStock = matchedVariant.stock;
      }

      if (typeof availableStock === 'number' && quantity > availableStock) {
        showToast(`Only ${availableStock} items left in stock`, 'error');
        return;
      }
    }

    // Create a unique operation key for this product/variant combination
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);

    // Optimistically update state IMMEDIATELY to keep UI responsive
    const previousItems = [...items];
    setItems((prevItems) =>
      prevItems.filter(item => item?.product).map((item) => {
        const isTarget = String(item.product.id || item.product._id) === String(productId) &&
          (!variantId || String((item.product as any).variantId || item.variant || (item.product as any).selectedVariant?._id) === String(variantId));

        if (isTarget) {
          return { ...item, quantity };
        }
        return item;
      })
    );

    // Prevent concurrent API operations on the same product
    if (pendingOperationsRef.current.has(operationKey)) {
      // Mark that we need to sync the latest quantity once current op finishes
      needsSyncRef.current.set(operationKey, quantity);
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    // Find the item to get its CartItemID (needed for API call)
    const apiItemToUpdate = items.find(item => {
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

    // Only sync to API if user is authenticated and item has CartItemID
    if (isAuthenticated && user?.userType === 'Customer' && apiItemToUpdate?.id) {
      try {
        const response = await apiUpdateCartItem(
          apiItemToUpdate.id,
          quantity,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          const apiItems = mapApiItemsToState(response.data.items);
          setItems(prevItems => {
            // Smart merge: Preserve local quantities if they are higher than what API just returned
            return apiItems.map(apiItem => {
              const localItem = prevItems.find(p => 
                String(p.product.id || p.product._id) === String(apiItem.product.id || apiItem.product._id)
              );
              if (localItem && localItem.quantity > apiItem.quantity) {
                return { ...apiItem, quantity: localItem.quantity };
              }
              return apiItem;
            });
          });
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error) {
        console.error("Update quantity failed", error);
        setItems(previousItems);
      } finally {
        pendingOperationsRef.current.delete(operationKey);
        
        // If we had more clicks while this one was pending, sync the FINAL quantity now
        if (needsSyncRef.current.has(operationKey)) {
          const finalQty = needsSyncRef.current.get(operationKey)!;
          needsSyncRef.current.delete(operationKey);
          updateQuantity(productId, finalQty, variantId, variantTitle);
        }
      }
    } else {
      // For guest users, just clean up
      pendingOperationsRef.current.delete(operationKey);
      
      // Still handle the "needs sync" case for local consistency
      if (needsSyncRef.current.has(operationKey)) {
        const finalQty = needsSyncRef.current.get(operationKey)!;
        needsSyncRef.current.delete(operationKey);
        updateQuantity(productId, finalQty, variantId, variantTitle);
      }
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


