import { Link, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
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


const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-700 font-bold';
    case 'On the way':
      return 'bg-purple-100 text-purple-700 font-bold';
    case 'Accepted':
      return 'bg-blue-100 text-blue-700 font-bold';
    case 'Placed':
      return 'bg-neutral-100 text-neutral-700 font-bold';
    default:
      return 'bg-neutral-100 text-neutral-700 font-bold';
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
    <div className="pb-4 md:pb-8">
      <header className="sticky top-0 z-[100] bg-white border-b border-neutral-100 px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-sm font-bold text-neutral-900 tracking-tight">My Orders</h1>
      </header>

      {orders.length === 0 ? (
        <div className="px-4 md:px-6 lg:px-8 py-12 md:py-16 text-center">
          <div className="text-6xl md:text-8xl mb-4">📦</div>
          <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">No orders yet</h2>
          <p className="text-neutral-600 mb-6 md:mb-8 md:text-lg">Start shopping to see your orders here!</p>
          <Link
            to="/"
            className="inline-block bg-[#ff3269] text-white px-8 md:px-10 py-3 rounded-xl font-bold hover:bg-[#ff1f5a] transition-all shadow-lg shadow-pink-100 hover:scale-105"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="px-4 md:px-6 lg:px-8 space-y-4 md:space-y-6">
          {orders.map((order) => {

          const shortId = order.id.split('-').slice(-1)[0];
          return (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-neutral-100 p-4 hover:shadow-xl hover:shadow-purple-100 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-bold text-neutral-900 mb-0.5 group-hover:text-[#ff3269] transition-colors">
                    Order #{shortId}
                  </div>
                  <div className="text-xs text-neutral-500">{formatDate(order.createdAt)}</div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                </div>
                <div className="text-lg font-bold text-neutral-900">
                  ₹{order.totalAmount.toFixed(0)}
                </div>
              </div>
            </Link>
          );
        })}
        </div>
      )}
    </div>
  );
}
