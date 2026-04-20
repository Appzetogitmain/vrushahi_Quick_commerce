import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/button";
import { useOrders } from "../../hooks/useOrders";
import { OrderStatus } from "../../types/order";
import GoogleMapsTracking from "../../components/GoogleMapsTracking";
import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import DeliveryPartnerCard from "../../components/DeliveryPartnerCard";
import RatingStars from "../../components/RatingStars";
import {
  cancelOrder,
  updateOrderNotes,
  getSellerLocationsForOrder,
} from "../../services/api/customerOrderService";
import api from "../../services/api/config";

// Icon Components
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
    className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const Share2Icon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.48L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ChefHatIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v5c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-5" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
  </svg>
);

const ReceiptIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </svg>
);

// Animated checkmark component
const AnimatedCheckmark = ({ delay = 0 }) => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    initial="hidden"
    animate="visible"
    className="mx-auto">
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      fill="none"
      stroke="#8b5cf6"
      strokeWidth="4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
    <motion.path
      d="M24 40 L35 51 L56 30"
      fill="none"
      stroke="#8b5cf6"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.4, ease: "easeOut" }}
    />
  </motion.svg>
);

const SectionItem = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  showArrow = true,
  rightContent,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
}) => (
  <motion.button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-dashed border-gray-200 last:border-0"
    whileTap={{ scale: 0.99 }}>
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
    </div>
    {rightContent ||
      (showArrow && <ChevronRightIcon className="w-5 h-5 text-gray-400" />)}
  </motion.button>
);

// Helper Component for Order Summary (Products + Billing)
const OrderSummaryCard = ({ order }: { order: any }) => {
  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}>
      <div className="p-4 bg-violet-50/50 border-b border-violet-100">
        <h3 className="font-semibold text-violet-900 flex items-center gap-2 text-sm uppercase tracking-wider">
          <ReceiptIcon className="w-4 h-4" />
          Order Summary
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Products List */}
        <div className="space-y-3">
          {order.items?.map((item: any, index: number) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                {item.product?.mainImage || item.productImage ? (
                  <img
                    src={item.product?.mainImage || item.productImage}
                    alt={item.productName || "Product"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    📦
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">
                  {item.productName || item.product?.productName}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>Qty: {item.quantity}</span>
                  {item.variation && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>
                        {typeof item.variation === 'object' ? 
                          ((item.variation as any).title || (item.variation as any).name || (item.variation as any).value) : 
                          item.variation}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 text-sm">
                  ₹{item.total?.toFixed(0) || (item.unitPrice * item.quantity).toFixed(0)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px bg-dashed bg-gray-200 my-4" style={{ backgroundImage: 'linear-gradient(to right, #e5e7eb 50%, transparent 50%)', backgroundSize: '10px 1px', backgroundRepeat: 'repeat-x', height: '1px' }} />

        {/* Bill Details */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">₹{order.subtotal?.toFixed(2)}</span>
          </div>
          {order.fees?.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery Fee</span>
              <span className="font-medium text-gray-900">₹{order.fees.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {order.fees?.platformFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee</span>
              <span className="font-medium text-gray-900">₹{order.fees.platformFee.toFixed(2)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST</span>
              <span className="font-medium text-gray-900">₹{order.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
            <span className="font-medium text-gray-600 text-sm italic">Grand Total</span>
            <span className="font-bold text-violet-600 font-mono text-lg">
              ₹{order.totalAmount?.toFixed(2) || order.total?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper Component for Order Details (Metadata)
const OrderInfoCard = ({ order }: { order: any }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}>
      <div className="p-4 bg-violet-50/50 border-b border-violet-100">
        <h3 className="font-semibold text-violet-900 flex items-center gap-2 text-sm uppercase tracking-wider">
          <MapPinIcon className="w-4 h-4" />
          Order Information
        </h3>
      </div>
      <div className="p-0 border-b border-dashed border-gray-100">
        <SectionItem
          icon={ReceiptIcon}
          title="Order ID"
          subtitle={order.orderNumber || order.id?.split("-").slice(-1)[0]}
          showArrow={false}
        />
        <SectionItem
          icon={PhoneIcon}
          title="Customer Name"
          subtitle={order.customerName || order.address?.name || "Customer"}
          showArrow={false}
        />
        <SectionItem
          icon={HomeIcon}
          title={order.status === 'Delivered' ? "Delivered To" : "Delivery Address"}
          subtitle={`${order.address?.address || order.address?.street}${order.address?.city ? ', ' + order.address.city : ''}`}
          showArrow={false}
        />
        <SectionItem
          icon={RefreshCwIcon}
          title="Order Placed Date"
          subtitle={formatDate(order.orderDate || order.createdAt)}
          showArrow={false}
        />
      </div>
    </motion.div>
  );
};

// Helper Component for Store Info
const StoreInfoCard = ({ order, loading }: { order: any, loading?: boolean }) => {
  // Logic to find store name from items if not directly on order
  const storeName = order.seller?.storeName || 
                    order.items?.[0]?.seller?.storeName || 
                    (loading ? "Loading Store..." : "Local Store");
  const storeCity = order.seller?.city || 
                    order.items?.[0]?.seller?.city || 
                    "";

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}>
      <div className="p-4 bg-violet-50/50 border-b border-violet-100">
        <h3 className="font-semibold text-violet-900 flex items-center gap-2 text-sm uppercase tracking-wider">
          <ChefHatIcon className="w-4 h-4" />
          Store Information
        </h3>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl">
          🛒
        </div>
      <div>
          <p className="font-bold text-gray-900 text-base uppercase tracking-tight">{storeName}</p>
          <p className="text-gray-500 text-xs">{storeCity}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Rating Section Component (Prompt after delivery)
const RatingSection = ({ onClick, isRated }: { onClick: () => void, isRated?: boolean }) => (
  <motion.div
    className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}>
    <div className="p-5 flex items-center justify-between cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${isRated ? 'bg-green-100' : 'bg-violet-100'} flex items-center justify-center text-2xl`}>
          {isRated ? '✅' : '⭐'}
        </div>
        <div>
          <p className="font-bold text-gray-900">{isRated ? 'Review Submitted' : 'Rate your order'}</p>
          <p className="text-xs text-gray-400 font-medium">{isRated ? 'Click here to edit your feedback' : 'How was your shopping experience?'}</p>
        </div>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-gray-300" />
    </div>
  </motion.div>
);

// Get Help Section Component
const GetHelpSection = () => (
  <motion.div
    className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15 }}>
    <div className="p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
          🆘
        </div>
        <div>
          <p className="font-bold text-gray-900">Need help with your order?</p>
          <p className="text-xs text-gray-400 font-medium">We're here to assist you 24/7</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/faq" className="w-full">
          <Button variant="outline" className="w-full border-gray-200 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
            Browse FAQs
          </Button>
        </Link>
        <a href="mailto:help@vrushahi.com" className="w-full">
          <Button variant="outline" className="w-full border-gray-200 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
            Email Support
          </Button>
        </a>
      </div>
    </div>
  </motion.div>
);

// Rating Overlay Component (Detailed View)
const RatingOverlay = ({ 
  order, 
  onClose,
  onSubmit,
  existingReviews = []
}: { 
  order: any; 
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  existingReviews?: any[];
}) => {
  const [ratings, setRatings] = useState<any>({
    delivery: 0,
    store: 0,
    items: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill existing ratings
  useEffect(() => {
    const initialRatings = { delivery: 0, store: 0, items: {} as any };
    existingReviews.forEach(rev => {
      if (rev.reviewType === 'DeliveryBoy' && rev.deliveryBoy) {
        initialRatings.delivery = rev.rating;
      }
      if (rev.reviewType === 'Seller' && rev.seller) {
        initialRatings.store = rev.rating;
      }
      if (rev.reviewType === 'Product' && rev.product) {
        // Convert ID to string for reliable mapping
        const prodId = rev.product.toString();
        initialRatings.items[prodId] = rev.rating;
      }
    });
    setRatings(initialRatings);
  }, [existingReviews]);

  const handleRate = (type: string, id: string | null, val: number) => {
    if (type === 'items' && id) {
      setRatings((prev: any) => ({
        ...prev,
        items: { ...prev.items, [id]: val }
      }));
    } else {
      setRatings((prev: any) => ({ ...prev, [type]: val }));
    }
  };

  const hasItemRating = (productId: string) => {
    return existingReviews.some(r => r.reviewType === 'Product' && r.product?.toString() === productId);
  };

  const handleAllSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(ratings);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const storeName = order.seller?.storeName || order.items?.[0]?.seller?.storeName || "Local Store";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col h-[100dvh] overflow-hidden">
      
      {/* 1. Header (Fixed at top) */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-gray-900" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Rate your experience</h2>
      </div>

      {/* 2. Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4 pb-4">
           {/* Delivery Rating Card */}
           <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Give your delivery<br />hero a rating!</h3>
              <RatingStars 
                rating={ratings.delivery} 
                onRate={(val) => handleRate('delivery', null, val)} 
                size="lg" 
              />
            </div>
            <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-violet-50 rounded-2xl text-3xl">
               🛵
            </div>
          </motion.div>

          {/* Store & Items Rating Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{storeName}</h3>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">{order.items?.length} Products</p>
              </div>
              <RatingStars 
                rating={ratings.store} 
                onRate={(val) => handleRate('store', null, val)} 
                size="md"
              />
            </div>
            <div className="divide-y divide-gray-50">
              {order.items?.map((item: any, idx: number) => {
               const productId = (item.product?._id || item.product)?.toString();
                 const isRated = hasItemRating(productId);
                 return (
                  <div key={idx} className="p-6 space-y-4">
                    <div className="flex gap-4">
                       <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0 overflow-hidden">
                          <img src={item.product?.mainImage || item.productImage} className="w-full h-full object-cover" alt="item" />
                       </div>
                       <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 line-clamp-2">{item.productName || item.product?.productName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.variation || "Regular"}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isRated ? 'Rated' : 'Rate Item'}</span>
                      <RatingStars 
                        rating={ratings.items[productId] || 0} 
                        onRate={(val) => handleRate('items', productId, val)} 
                        size="sm" 
                      />
                    </div>
                  </div>
                 );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3. Footer (Fixed at bottom) */}
      <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-2xl mx-auto">
           <Button 
            disabled={isSubmitting}
            onClick={handleAllSubmit}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-4 font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-violet-100 border-none transition-transform active:scale-95">
             {isSubmitting ? 'Submitting...' : existingReviews.length > 0 ? 'Update All Ratings' : 'Submit All Ratings'}
           </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
  const { getOrderById, fetchOrderById, loading: contextLoading } = useOrders();
  const [order, setOrder] = useState<any>(id ? getOrderById(id) : undefined);
  const [loading, setLoading] = useState(!order);

  const [showConfirmation, setShowConfirmation] = useState(confirmed);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    order?.status || "Placed"
  );
  const [estimatedTime, setEstimatedTime] = useState(24);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationValue: number;
    distanceValue: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deliveryPromiseInfo, setDeliveryPromiseInfo] = useState<{
    message: string;
    isLate: boolean;
    delayMins: number;
  }>({ message: "Calculating...", isLate: false, delayMins: 0 });

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingOverlay, setShowRatingOverlay] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showSpecialRequestsModal, setShowSpecialRequestsModal] =
    useState(false);

  const [existingReviews, setExistingReviews] = useState<any[]>([]);

  // Form states
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");

  // Real-time delivery tracking via WebSocket
  const {
    deliveryLocation,
    eta,
    distance,
    status: trackingStatus,
    orderStatus: socketOrderStatus, // Real-time order status from socket
    isConnected,
    lastUpdate,
    error: trackingError,
  } = useDeliveryTracking(id);

  // Seller locations for the order
  const [sellerLocations, setSellerLocations] = useState<any[]>([]);
  const [loadingSellerLocations, setLoadingSellerLocations] = useState(false);

  // Fetch order if not in context
  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderStatus(existingOrder.status);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const [fetchedOrder, fetchedReviews] = await Promise.all([
        fetchOrderById(id),
        api.get(`/customer/reviews/order/${id}`).then(res => res.data.data).catch(() => [])
      ]);

      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
      if (fetchedReviews) {
        setExistingReviews(fetchedReviews);
      }
      setLoading(false);
    };

    loadOrder();
  }, [id, getOrderById, fetchOrderById]);

  // Fetch seller locations when order is loaded
  useEffect(() => {
    const fetchSellerLocations = async () => {
      if (!id || !order) return;

      // Only fetch if order has delivery boy assigned and status is before "Picked up" or "Out for Delivery"
      const shouldFetch =
        order.status &&
        order.status !== "Delivered" &&
        order.status !== "Cancelled" &&
        order.status !== "Picked up" &&
        order.status !== "Out for Delivery";

      if (shouldFetch) {
        try {
          setLoadingSellerLocations(true);
          const response = await getSellerLocationsForOrder(id);
          if (response.success && response.data) {
            setSellerLocations(response.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch seller locations:", err);
        } finally {
          setLoadingSellerLocations(false);
        }
      }
    };

    fetchSellerLocations();
  }, [id, order?.status]);

  // Update orderStatus when order state changes
  useEffect(() => {
    if (order) {
      setOrderStatus(order.status);
    }
  }, [order]);

  // Real-time order status updates from socket
  useEffect(() => {
    if (socketOrderStatus && socketOrderStatus !== orderStatus) {
      console.log("🔄 Real-time status update:", socketOrderStatus);
      setOrderStatus(socketOrderStatus as OrderStatus);

      // Re-fetch order to get complete updated data
      if (id) {
        fetchOrderById(id).then((fetchedOrder) => {
          if (fetchedOrder) {
            setOrder(fetchedOrder);
          }
        });
      }
    }
  }, [socketOrderStatus, orderStatus, id, fetchOrderById]);

  // Simulate order status progression
  useEffect(() => {
    if (confirmed && order) {
      const timer1 = setTimeout(() => {
        setShowConfirmation(false);
        setOrderStatus("Accepted");
      }, 3000);
      return () => clearTimeout(timer1);
    }
  }, [confirmed, order]);

  // Delivery Promise Logic (24 mins)
  useEffect(() => {
    const updatePromise = () => {
      if (!order || (!order.orderDate && !order.createdAt)) return;

      const orderTime = new Date(order.orderDate || order.createdAt).getTime();
      const now = new Date().getTime();
      const targetLimit = 24;

      if (orderStatus === "Delivered") {
        const deliveredTime = order.deliveredAt 
          ? new Date(order.deliveredAt).getTime() 
          : order.updatedAt 
            ? new Date(order.updatedAt).getTime() 
            : now;
            
        const totalDuration = Math.floor((deliveredTime - orderTime) / 60000);
        const displayDuration = Math.max(1, totalDuration);

        if (displayDuration <= targetLimit) {
          setDeliveryPromiseInfo({
            message: "Delivered within time",
            isLate: false,
            delayMins: 0
          });
        } else {
          setDeliveryPromiseInfo({
            message: `Delivered in ${displayDuration} mins`,
            isLate: displayDuration > targetLimit,
            delayMins: displayDuration > targetLimit ? displayDuration - targetLimit : 0
          });
        }
      } else if (orderStatus === "Cancelled" || orderStatus === "Rejected") {
        setDeliveryPromiseInfo({ message: "Order Cancelled", isLate: false, delayMins: 0 });
      } else {
        const elapsedMins = Math.floor((now - orderTime) / 60000);
        if (elapsedMins < targetLimit) {
          setDeliveryPromiseInfo({
            message: "Arriving within 24 minutes",
            isLate: false,
            delayMins: 0
          });
        } else {
          setDeliveryPromiseInfo({
            message: `Delayed by ${elapsedMins - targetLimit} mins`,
            isLate: true,
            delayMins: elapsedMins - targetLimit
          });
        }
      }
    };

    updatePromise();
    if (orderStatus !== "Delivered" && orderStatus !== "Cancelled" && orderStatus !== "Rejected") {
      const timer = setInterval(updatePromise, 30000);
      return () => clearInterval(timer);
    }
  }, [order, orderStatus]);

  // Handler functions
  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    const [fetchedOrder, fetchedReviews] = await Promise.all([
      fetchOrderById(id),
      api.get(`/customer/reviews/order/${id}`).then(res => res.data.data).catch(() => [])
    ]);
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setOrderStatus(fetchedOrder.status);
    }
    if (fetchedReviews) {
      setExistingReviews(fetchedReviews);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Order #${order?.id?.split("-").slice(-1)[0]}`,
      text: `Track my vrushahi order: Order #${
        order?.id?.split("-").slice(-1)[0]
      }`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }

    if (!id) return;

    try {
      await cancelOrder(id, cancellationReason);
      setOrderStatus("Cancelled" as any);
      setShowCancelModal(false);
      alert("Order cancelled successfully");
      handleRefresh();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order");
    }
  };

  const handleSaveInstructions = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { deliveryInstructions });
      setShowInstructionsModal(false);
      handleRefresh();
    } catch (error) {
      console.error("Failed to save instructions:", error);
      alert("Failed to save instructions");
    }
  };

  const handleSaveSpecialRequests = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { specialRequests });
      setShowSpecialRequestsModal(false);
      handleRefresh();
    } catch (error) {
      console.error("Failed to save special requests:", error);
      alert("Failed to save special requests");
    }
  };

  const handleSubmitAllRatings = async (ratingData: any) => {
    try {
      // 1. Submit Delivery Rating
      if (ratingData.delivery > 0 && order.deliveryBoy) {
        await api.post('/customer/reviews', {
          orderId: id,
          deliveryBoyId: order.deliveryBoy._id || order.deliveryBoy,
          rating: ratingData.delivery,
          reviewType: 'DeliveryBoy'
        });
      }

      // 2. Submit Store Rating
      if (ratingData.store > 0) {
        const sellerId = order.seller?._id || order.items?.[0]?.seller?._id || order.seller;
        if (sellerId) {
          await api.post('/customer/reviews', {
            orderId: id,
            sellerId: sellerId,
            rating: ratingData.store,
            reviewType: 'Seller'
          });
        }
      }

      // 3. Submit Items Ratings
      for (const [productId, rating] of Object.entries(ratingData.items)) {
        if ((rating as number) > 0) {
          await api.post('/customer/reviews', {
            orderId: id,
            productId,
            rating,
            reviewType: 'Product'
          });
        }
      }

      alert("Thank you for your rating!");
    } catch (error: any) {
      console.error("Rating submission failed:", error);
      alert(error.response?.data?.message || "Failed to submit rating");
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b5cf6]"></div>
          <p className="text-sm font-bold text-neutral-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">
            Order Not Found
          </h1>
          <Link to="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { title: string; subtitle: string; color: string }
  > = {
    Placed: {
      title: "Order placed",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    Accepted: {
      title: "Preparing your order",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    "On the way": {
      title: "Order picked up",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    Delivered: {
      title: "Order delivered",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    Received: {
      title: "Order received",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    Pending: {
      title: "Order pending",
      subtitle: "Waiting for confirmation",
      color: "bg-yellow-600",
    },
    Processed: {
      title: "Order processed",
      subtitle: "Preparing for delivery",
      color: "bg-[#8b5cf6]",
    },
    Shipped: {
      title: "Order shipped",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#3b82f6]",
    },
    "Out for Delivery": {
      title: "Out for delivery",
      subtitle: deliveryPromiseInfo.message,
      color: "bg-[#8b5cf6]",
    },
    Cancelled: {
      title: "Order cancelled",
      subtitle: "This order has been cancelled",
      color: "bg-red-600",
    },
    Returned: {
      title: "Order returned",
      subtitle: "This order has been returned",
      color: "bg-gray-600",
    },
  };

  const currentStatus = statusConfig[orderStatus] || statusConfig["Received"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Order Confirmed Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center px-8">
              <AnimatedCheckmark delay={0.3} />
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="text-xl font-bold text-gray-900 mt-6 tracking-tight uppercase">
                Order Confirmed!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-gray-500 mt-2 font-semibold uppercase tracking-widest text-[10px]">
                Your order has been placed successfully
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-8">
                <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin mx-auto" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="sticky top-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}>
        {/* Small Navigation Bar with Status Color */}
        <div className={`${currentStatus.color} text-white flex items-center justify-between px-4 py-2 shadow-md relative z-10`}>
          <Link to="/orders">
            <motion.button
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              whileTap={{ scale: 0.9 }}>
              <ArrowLeftIcon className="w-5 h-5 stroke-[3]" />
            </motion.button>
          </Link>
          <h2 className="font-bold text-[10px] uppercase tracking-widest opacity-90">Order Tracking</h2>
          <motion.button
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}>
            <Share2Icon className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        </div>

        {/* Clean Status Area with White Background */}
        <div className="bg-white border-b border-gray-100 px-4 py-6 text-center shadow-sm">
          <motion.h1
            className="text-2xl font-bold mb-1 uppercase tracking-tight text-gray-900"
            key={currentStatus.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}>
            {currentStatus.title}
          </motion.h1>

          <motion.div
            className="inline-flex items-center gap-2 rounded-full px-5 py-1 bg-violet-50 text-violet-600 border border-violet-100 mt-1"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}>
            <span className="text-[10px] font-bold uppercase tracking-widest">{currentStatus.subtitle}</span>
            <motion.button
              onClick={handleRefresh}
              className="ml-1"
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.5 }}>
              <RefreshCwIcon className="w-3 h-3" />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto">
        {/* Scrollable Content */}
        <div className="px-4 py-6 space-y-6 pb-32">
          
          {/* Active Order Live Tracking Components */}
          {!showConfirmation && !["Delivered", "Cancelled", "Returned"].includes(orderStatus) && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}>
              
              {/* Map Section */}
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-violet-100 ring-1 ring-violet-50">
                <GoogleMapsTracking
                  sellerLocations={sellerLocations.map((s) => ({
                    lat: s.latitude,
                    lng: s.longitude,
                    name: s.storeName,
                  }))}
                  customerLocation={{
                    lat: order?.address?.latitude || 0,
                    lng: order?.address?.longitude || 0,
                  }}
                  deliveryLocation={deliveryLocation || undefined}
                  isTracking={isConnected && !!deliveryLocation}
                  showRoute={isConnected && !!deliveryLocation}
                  routeOrigin={deliveryLocation || undefined}
                  routeDestination={{
                    lat: order?.address?.latitude || 0,
                    lng: order?.address?.longitude || 0,
                  }}
                  onRouteInfoUpdate={setRouteInfo}
                  lastUpdate={lastUpdate}
                />
              </div>

              {/* Delivery Partner Card */}
              {(order?.deliveryPartner || order?.deliveryOtp) && (
                <DeliveryPartnerCard
                  partner={{
                    name: order?.deliveryPartner?.name || "Delivery Hero",
                    phone: order?.deliveryPartner?.phone,
                    profileImage: order?.deliveryPartner?.profileImage,
                    vehicleNumber: order?.deliveryPartner?.vehicleNumber,
                  }}
                  eta={routeInfo ? Math.ceil(routeInfo.durationValue / 60) : eta}
                  distance={0}
                  isTracking={isConnected && !!deliveryLocation}
                  deliveryOtp={order?.deliveryOtp}
                  onCall={() => {
                    const phone = order?.deliveryPartner?.phone || "1234567890";
                    window.location.href = `tel:${phone}`;
                  }}
                />
              )}
            </motion.div>
          )}

          {/* New Section 1: Order Summary (Products & Billing) */}
          <OrderSummaryCard order={order} />

          {/* New Section: Rating Prompt (Only after delivery) */}
          {orderStatus === 'Delivered' && (
            <>
              <RatingSection 
                onClick={() => setShowRatingOverlay(true)} 
                isRated={existingReviews.length > 0}
              />
              <GetHelpSection />
            </>
          )}

          {/* New Section 2: Order Details (Metadata) */}
          <OrderInfoCard order={order} />

          {/* New Section 3: Store Information */}
          <StoreInfoCard order={order} loading={loading} />

          {/* Bottom Actions */}
          <div className="flex gap-4 items-center pt-4">
            {order?.invoiceEnabled && (
              <Link to={`/orders/${id}/invoice`} className="flex-1">
                <Button className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-4 font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-violet-100 border-none transition-all">
                  View Invoice
                </Button>
              </Link>
            )}
            
            {/* Cancel Button - Only show for early stages before acceptance */}
            {["Placed", "Pending"].includes(orderStatus) && (
              <Button 
                variant="outline" 
                className="flex-1 border-gray-200 py-4 font-black uppercase text-xs tracking-widest rounded-2xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all"
                onClick={() => setShowCancelModal(true)}>
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                Cancel Order?
              </h2>
              <p className="text-sm text-gray-500 mb-6 font-medium">
                We're sorry to see you go. Please let us know why you're cancelling.
              </p>
              <textarea
                className="w-full bg-gray-50 border-none rounded-2xl p-4 mb-6 focus:ring-2 focus:ring-violet-500 transition-all min-h-[120px]"
                placeholder="Reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 border-none py-4 font-black uppercase text-xs tracking-widest rounded-2xl"
                  onClick={handleCancelOrder}>
                  Confirm Cancellation
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-none py-4 font-black uppercase text-xs tracking-widest rounded-2xl text-violet-600"
                  onClick={() => setShowCancelModal(false)}>
                  Keep My Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Overlay Overlay */}
      <AnimatePresence>
        {showRatingOverlay && (
          <RatingOverlay 
            order={order} 
            onClose={() => setShowRatingOverlay(false)} 
            onSubmit={handleSubmitAllRatings}
            existingReviews={existingReviews}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
