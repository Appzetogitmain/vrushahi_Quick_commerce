import { Link, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import CartIconButton from '../../components/CartIconButton';

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Delivered':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Delivered', dot: 'bg-emerald-500' };
    case 'On the way':
    case 'Out for Delivery':
    case 'Shipped':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: status, dot: 'bg-purple-500 animate-pulse' };
    case 'Accepted':
    case 'Processed':
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: status, dot: 'bg-blue-500' };
    case 'Return Completed':
      return { bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'Return Completed', dot: 'bg-teal-500' };
    case 'Return Approved':
      return { bg: 'bg-violet-50 text-violet-700 border-violet-200', text: 'Return Approved', dot: 'bg-violet-500' };
    case 'Return Pending':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Return Pending', dot: 'bg-amber-500 animate-pulse' };
    case 'Return Rejected':
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Return Rejected', dot: 'bg-rose-500' };
    case 'Cancelled':
    case 'Rejected':
      return { bg: 'bg-red-50 text-red-700 border-red-200', text: status, dot: 'bg-red-500' };
    default:
      return { bg: 'bg-neutral-50 text-neutral-700 border-neutral-200', text: status || 'Placed', dot: 'bg-neutral-400' };
  }
};

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

export default function Orders() {
  const { orders } = useOrders();
  const navigate = useNavigate();

  console.log('📋 Orders component - orders:', orders);
  console.log('📋 Orders count:', orders.length);

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-12 md:pb-20">
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-neutral-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 rounded-full transition-colors active:scale-95"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">My Orders</h1>
        </div>
        <CartIconButton 
          className="hover:bg-neutral-100 transition-colors"
          iconColor="#171717"
        />
      </header>

      {orders.length === 0 ? (
        <div className="px-4 md:px-6 lg:px-8 py-20 text-center max-w-md mx-auto">
          <div className="text-7xl md:text-8xl mb-6 animate-bounce">🛍️</div>
          <h2 className="text-2xl font-black text-neutral-900 mb-3 tracking-tight">No orders yet</h2>
          <p className="text-neutral-500 mb-8 leading-relaxed text-sm md:text-base">Looks like you haven't made your first order yet. Explore our fresh products and order now!</p>
          <Link
            to="/"
            className="inline-block w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl shadow-pink-500/25 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] font-bold text-base tracking-wide"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="px-4 md:px-6 lg:px-8 py-4 max-w-4xl mx-auto space-y-3.5">
          {orders.map((order: any) => {
            const displayOrderNumber = order.orderNumber || `ORD${order.id.slice(-8).toUpperCase()}`;
            const badge = getStatusBadge(order.status);
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2 bg-neutral-50/50 overflow-hidden">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex-shrink-0">Order</span>
                      <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-pink-600 transition-colors truncate block">
                        #{displayOrderNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5 truncate">{formatDate(order.createdAt)}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-2xs flex-shrink-0 max-w-[130px] sm:max-w-none ${badge.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`}></span>
                    <span className="text-[11px] sm:text-xs font-bold tracking-wide truncate">{badge.text}</span>
                  </div>
                </div>

                {/* Product Items List */}
                <div className="p-3 sm:p-4 flex-1 divide-y divide-neutral-100">
                  {items.map((item: any, idx: number) => {
                    const product = item?.product || {};
                    const productName = product?.productName || item?.productName || 'Fresh Item';
                    const variant = item?.variant || item?.variation || '';
                    
                    let displayImage = item?.productImage || product?.mainImage || '/assets/placeholder.png';
                    if ((!item?.productImage || item?.productImage === '') && product?.variations?.length > 0) {
                      // Try to find matching variation
                      const matchingVar = product.variations.find((v: any) => 
                        v.title === variant || v.value === variant || v.pack === variant || v._id === variant
                      );
                      if (matchingVar && matchingVar.image) {
                        displayImage = matchingVar.image;
                      } else if (product.variations[0]?.image) {
                        displayImage = product.variations[0].image;
                      }
                    }
                    if (!displayImage) displayImage = '/assets/placeholder.png';

                    const quantity = item?.quantity || 1;
                    return (
                      <div key={idx} className={`${idx > 0 ? 'pt-3 mt-3' : ''} flex items-center gap-3`}>
                        <div className="w-12 h-12 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-200/60 shadow-inner">
                          <img
                            src={displayImage}
                            alt={productName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/placeholder.png';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                            {productName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-500 font-medium">
                            {variant && <span className="truncate max-w-[100px] sm:max-w-none">{typeof variant === 'object' ? (variant?.title || variant?.value) : variant}</span>}
                            {variant && <span className="text-neutral-300">•</span>}
                            <span className="font-bold text-neutral-700 flex-shrink-0">Qty: {quantity}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs sm:text-sm font-black text-neutral-900">
                            ₹{product?.price ? (product.price * quantity).toFixed(0) : (item?.price ? (item.price * quantity).toFixed(0) : '0')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-2.5 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between gap-3 overflow-hidden">
                  <div className="flex items-baseline gap-1.5 min-w-0 pr-2">
                    <span className="text-[11px] font-semibold text-neutral-500 flex-shrink-0">Total:</span>
                    <span className="text-sm sm:text-base font-black text-neutral-900 truncate">₹{order.totalAmount?.toFixed(0)}</span>
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-1 flex-shrink-0 px-3.5 py-1.5 bg-white border border-neutral-300 hover:border-pink-500 hover:bg-pink-50 hover:text-pink-600 text-neutral-700 font-bold text-xs rounded-xl shadow-2xs transition-all duration-200 active:scale-95"
                  >
                    <span>Details</span>
                    <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
