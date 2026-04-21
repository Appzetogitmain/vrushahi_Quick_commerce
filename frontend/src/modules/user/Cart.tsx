import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import Button from '../../components/ui/button';
import { appConfig } from '../../services/configService';
import { calculateProductPrice } from '../../utils/priceUtils';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  const threshold = cart.freeDeliveryThreshold ?? appConfig.freeDeliveryThreshold;
  const deliveryFee = cart.estimatedDeliveryFee ?? (cart.total >= threshold ? 0 : appConfig.deliveryFee);
  const platformFee = cart.platformFee ?? appConfig.platformFee;
  const totalAmount = cart.total + deliveryFee + platformFee;

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-white/50 backdrop-blur-sm rounded-3xl mx-4 my-8 border border-white">
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-pink-200 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <img 
            src="/assets/empty-cart.png" 
            alt="Empty Cart" 
            className="w-48 h-48 md:w-64 md:h-64 object-contain relative transition-transform duration-700 hover:scale-110"
          />
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-neutral-900 mb-4 tracking-tight">Your basket feels light</h2>
        <p className="text-neutral-500 mb-10 max-w-sm mx-auto font-medium text-sm md:text-lg">
          It looks like you haven't added anything to your cart yet. Let's find some amazing products for you!
        </p>
        <Link to="/">
          <Button 
            variant="pinkOutline"
            className="h-11 md:h-13 px-8 md:px-10 text-sm md:text-base font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:shadow-pink-100 border-2"
          >
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-800 tracking-tight">Your Basket</h1>
              <p className="text-xs md:text-sm font-medium text-neutral-500 mt-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Safe & Secure Delivery • in {appConfig.estimatedDeliveryTime}
              </p>
            </div>
            {cart.items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors bg-red-50 px-4 py-2 rounded-xl"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Cart Items Column */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const { displayPrice, mrp, hasDiscount } = calculateProductPrice(item.product, item.variant);
              return (
                <div
                  key={item.product.id + (item.variant || '')}
                  className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-6 shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group"
                >
                  <div className="flex gap-4 md:gap-8">
                    {/* Product Image */}
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-100 group-hover:scale-[1.02] transition-transform">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-3xl font-black text-neutral-200">
                          {item.product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-neutral-800 text-sm md:text-lg line-clamp-1 group-hover:text-[#ff3269] transition-colors">
                            {item.product.name}
                          </h3>
                          <button
                            onClick={() => {
                              const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                              const variantTitle = (item.product as any).variantTitle || item.product.pack;
                              removeFromCart(item.product.id, variantId, variantTitle);
                            }}
                            className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs md:text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
                          {item.variant ? (
                            typeof item.variant === 'object' ? 
                              ((item.variant as any).title || (item.variant as any).name || (item.variant as any).value) : 
                              item.variant
                          ) : item.product.pack}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2 mb-1">
                            <span className="text-base md:text-xl font-bold text-neutral-800">
                              ₹{displayPrice.toLocaleString('en-IN')}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs md:text-sm text-neutral-400 line-through font-medium">
                                ₹{mrp.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {hasDiscount && (
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full w-fit">
                              Saved ₹{(mrp - displayPrice).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center bg-neutral-100/50 rounded-xl p-1 border border-neutral-100">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant)}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-neutral-600 hover:bg-white hover:text-[#ff3269] rounded-lg transition-all font-black"
                          >
                            −
                          </button>
                          <span className="text-sm md:text-base font-bold text-neutral-800 min-w-[2.5rem] md:min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant)}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-neutral-600 hover:bg-white hover:text-[#ff3269] rounded-lg transition-all font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary Column */}
          <div className="lg:sticky lg:top-[120px]">
            <div className="bg-white rounded-[2rem] border border-neutral-100 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden">
              {/* Decorative Gradient Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
              
              <h2 className="text-lg md:text-xl font-bold text-neutral-800 mb-6 relative">Bill Summary</h2>
              
              <div className="space-y-4 mb-8 relative">
                <div className="flex justify-between items-center text-neutral-500 text-sm md:text-base">
                  <span className="font-medium">Item Total</span>
                  <span className="font-semibold text-neutral-800">₹{cart.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 text-sm md:text-base">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Platform Fee</span>
                    <svg className="w-3.5 h-3.5 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                       <circle cx="12" cy="12" r="10" />
                       <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="font-semibold text-neutral-800">₹{platformFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 text-sm md:text-base">
                  <span className="font-medium">Delivery Partner Fee</span>
                  <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : 'text-neutral-800'}`}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}
                  </span>
                </div>

            {cart.total < threshold && (
                  <div className="mt-4 p-4 bg-sky-50 rounded-2xl border border-sky-100">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Free Delivery Goal</span>
                       <span className="text-xs font-bold text-sky-600">₹{cart.total} / ₹{threshold}</span>
                    </div>
                    <div className="w-full h-1.5 bg-sky-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                         style={{ width: `${Math.min((cart.total / threshold) * 100, 100)}%` }}
                       />
                    </div>
                    <p className="text-[11px] font-medium text-sky-700 mt-2">
                      Add ₹{(threshold - cart.total).toLocaleString('en-IN')} more to get <span className="font-black">FREE delivery!</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-neutral-100 pt-6 mb-8">
                <div className="flex justify-between items-center group">
                  <span className="text-base md:text-lg font-bold text-neutral-800">Total to pay</span>
                  <div className="text-right">
                    <span className="text-lg md:text-2xl font-bold text-neutral-800 group-hover:text-[#ff3269] transition-colors">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                    <p className="text-[10px] font-medium text-green-600 uppercase tracking-widest mt-1">Inclusive of all taxes</p>
                  </div>
                </div>
              </div>

              <Button
                variant="pinkOutline"
                size="lg"
                onClick={handleCheckout}
                className="w-full h-12 md:h-14 text-base md:text-lg font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-md hover:shadow-pink-100 border-2"
              >
                Proceed to Checkout
              </Button>
              
              <div className="mt-6 flex items-center justify-center gap-2 text-neutral-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">100% Safe Payments</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

