import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import SummaryBar from '../components/SummaryBar';
import DashboardCard from '../components/DashboardCard';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getDashboardStats } from '../../../services/api/delivery/deliveryService';
import { useDeliveryStatus } from '../context/DeliveryStatusContext';

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { isOnline, sellersInRangeCount, locationError } = useDeliveryStatus();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPvPopup, setShowPvPopup] = useState(false);
  const [pvRemainingDays, setPvRemainingDays] = useState<number | null>(null);
  const [isPvExpired, setIsPvExpired] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
        
        // Police Verification Logic
        if (!data.policeVerificationForm && data.policeVerificationDeadline) {
          const deadline = new Date(data.policeVerificationDeadline);
          const now = new Date();
          const diffTime = deadline.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setPvRemainingDays(diffDays);
          
          if (diffDays <= 0) {
            setIsPvExpired(true);
          } else if (diffDays === 1) {
            // Last day popup
            setShowPvPopup(true);
            // Play alert sound
            const audio = new Audio('/src/assets/sound/delivery-alert.mp3');
            audio.play().catch(e => console.log('Audio play blocked:', e));
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Icons for dashboard cards (Keep existing SVGs)
  const pendingOrderIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 17H4L5 12H19L20 17H22M2 17C2 18.1046 2.89543 19 4 19C5.10457 19 6 18.1046 6 17M2 17C2 15.8954 2.89543 15 4 15C5.10457 15 6 15.8954 6 17M22 17C22 18.1046 21.1046 19 20 19C18.8954 19 18 18.1046 18 17M22 17C22 15.8954 21.1046 15 20 15C18.8954 15 18 15.8954 18 17M6 17H18M5 12L4 7H2M20 12L21 7H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M8 10H10M12 10H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );

  const allOrderIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 17H4L5 12H19L20 17H22M2 17C2 18.1046 2.89543 19 4 19C5.10457 19 6 18.1046 6 17M2 17C2 15.8954 2.89543 15 4 15C5.10457 15 6 15.8954 6 17M22 17C22 18.1046 21.1046 19 20 19C18.8954 19 18 18.1046 18 17M22 17C22 15.8954 21.1046 15 20 15C18.8954 15 18 15.8954 18 17M6 17H18M5 12L4 7H2M20 12L21 7H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="7" y="5" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="8" y="3" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );

  const returnOrderIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );

  const returnItemIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12L7 8M3 12L7 16M3 12H21M21 12L17 8M21 12L17 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );

  const dailyCollectionIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M6 10H18M6 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d="M9 17L11 19L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  const cashBalanceIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M6 10H18M6 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="12" r="2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );

  const earningIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M6 10H18M6 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M16 12H20M18 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading dashboard...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  // Verification Pending Screen
  if (stats?.status === 'Inactive') {
    return (
      <div className="min-h-screen bg-neutral-100 pb-20">
        <DeliveryHeader />
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2 uppercase tracking-tight">Verification Pending</h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-8">
            Your registration is currently under review. Platform will verify your documents and approve your account shortly.
          </p>
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Step 1</p>
                <p className="font-bold text-neutral-800">Registration Submitted</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Step 2</p>
                <p className="font-bold text-neutral-800">Platform Review (In Progress)</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-10 px-8 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95"
          >
            Refresh Status
          </button>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  // Rejected Screen
  if (stats?.status === 'Rejected') {
    return (
      <div className="min-h-screen bg-neutral-100 pb-20">
        <DeliveryHeader />
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-red-600 mb-2 uppercase tracking-tight">Application Rejected</h2>
          <div className="bg-white p-6 rounded-3xl border-2 border-red-100 shadow-sm w-full mb-8">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Reason for Rejection</p>
            <p className="text-neutral-800 font-bold leading-relaxed italic">
              "{stats?.rejectionReason || 'Your documents were invalid or unclear.'}"
            </p>
          </div>
          <p className="text-neutral-600 font-medium mb-8 leading-relaxed">
            Please update your profile details or upload clear documents to re-apply for verification.
          </p>
          <button 
            onClick={() => navigate('/delivery/profile')}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95"
          >
            Update Profile & Re-Apply
          </button>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-red-500">{error}</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      {/* Header */}
      <DeliveryHeader />
      
      {/* Cash Limit Warning Banner */}
      {stats?.isCashLimitReached && (
        <div className="px-4 py-3 flex items-center justify-between border-b bg-red-600 text-white border-red-700">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-tight leading-tight">
              Cash Limit Reached - New Orders Blocked
            </span>
          </div>
          <button 
            onClick={() => navigate('/delivery/wallet')}
            className="text-[10px] font-black uppercase px-2 py-1 rounded border bg-white text-red-600 border-white shrink-0 ml-2"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Police Verification Warning Banner */}
      {!stats?.policeVerificationForm && stats?.policeVerificationDeadline && (
        <div className={`px-4 py-3 flex items-center justify-between border-b ${isPvExpired ? 'bg-red-600 text-white border-red-700' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-tight">
              {isPvExpired 
                ? "Verification Expired - New Orders Blocked" 
                : `Police Verification Required - ${pvRemainingDays} Day(s) Left`}
            </span>
          </div>
          <button 
            onClick={() => navigate('/delivery/profile')}
            className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${isPvExpired ? 'bg-white text-red-600 border-white' : 'bg-amber-800 text-white border-amber-800'}`}
          >
            Upload Now
          </button>
        </div>
      )}

      {/* Location Error Warning Banner */}
      {locationError && (
        <div className="px-4 py-3 flex items-center gap-2 bg-red-600 text-white border-b border-red-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-tight leading-tight">
            {locationError}
          </span>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Daily Collection & Cash Balance Bar */}
        <SummaryBar
          leftIcon={dailyCollectionIcon}
          leftLabel="Daily Collection"
          leftValue={`₹ ${stats?.dailyCollection?.toLocaleString('en-IN') || '0'}`}
          rightIcon={cashBalanceIcon}
          rightLabel="Amount Owed"
          rightValue={`₹ ${stats?.pendingAdminPayout?.toFixed(2) || '0.00'}`}
          accentColor="#FFC94A"
        />

        {/* Real-time Seller Radius Indicator */}
        <div
          onClick={() => isOnline && navigate('/delivery/sellers-in-range')}
          className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-95 ${isOnline ? 'bg-teal-50 border-teal-100 hover:bg-teal-100' : 'bg-neutral-50 border-neutral-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isOnline ? 'bg-teal-100 text-teal-600' : 'bg-neutral-200 text-neutral-400'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isOnline ? 'text-teal-900' : 'text-neutral-500'}`}>
                  {isOnline ? 'Active Service Areas' : 'Offline'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isOnline
                    ? `You are currently in ${sellersInRangeCount} seller radius`
                    : 'Go online to track service areas'}
                </p>
              </div>
            </div>
            {isOnline && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <span className="text-xl font-bold text-teal-600">{sellersInRangeCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <DashboardCard
            icon={pendingOrderIcon}
            title="Today's Pending Order"
            value={stats?.pendingOrders || 0}
            accentColor="#16a34a"
            onClick={() => navigate('/delivery/orders/all')} // Should probably link to pending
          />
          <DashboardCard
            icon={allOrderIcon}
            title="Today's All Order"
            value={stats?.allOrders || 0}
            accentColor="#ef4444"
            onClick={() => navigate('/delivery/orders/all')}
          />
          <DashboardCard
            icon={returnOrderIcon}
            title="Today's Return Order"
            value={stats?.returnOrders || 0}
            accentColor="#f97316"
            onClick={() => navigate('/delivery/orders/return')}
          />
          <DashboardCard
            icon={returnItemIcon}
            title="Total return item have"
            value={stats?.returnItems || 0}
            accentColor="#3b82f6"
            onClick={() => navigate('/delivery/orders/return')}
          />
        </div>

        {/* Today's Earning & Total Earning Bar */}
        <SummaryBar
          leftIcon={earningIcon}
          leftLabel="Today's Earning"
          leftValue={`₹ ${stats?.todayEarning || 0}`}
          rightIcon={cashBalanceIcon}
          rightLabel="Total Earning"
          rightValue={`₹ ${stats?.totalEarning?.toFixed(2) || '0.00'}`}
          accentColor="#16a34a"
        />

        {/* Today's Pending Order Section */}
        <div className="mt-6">
          <h2 className="text-neutral-900 text-lg font-semibold mb-4">Todays Pending Order</h2>
          {stats?.pendingOrdersList && stats.pendingOrdersList.length > 0 ? (
            <div className="space-y-3">
              {stats.pendingOrdersList.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 cursor-pointer"
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-neutral-900 font-semibold text-sm">{order.orderId}</p>
                      <p className="text-neutral-600 text-xs mt-1">{order.customerName}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Ready for pickup'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-xs mb-2">{order.address}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-neutral-900 font-bold">₹ {order.totalAmount}</p>
                    {order.estimatedDeliveryTime && (
                      <p className="text-neutral-500 text-xs">
                        ETA: {order.estimatedDeliveryTime}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 min-h-[200px] flex items-center justify-center shadow-sm border border-neutral-200">
              <p className="text-neutral-500 text-sm">No pending orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <DeliveryBottomNav />

      {/* Police Verification Last Day Popup */}
      {showPvPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPvPopup(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="bg-red-600 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">URGENT ACTION REQUIRED</h3>
              <p className="text-white/80 font-bold text-sm">Today is your last day!</p>
            </div>
            <div className="p-8 text-center">
              <p className="text-neutral-600 font-bold text-base leading-relaxed mb-8">
                Today is the last day to upload Police Verification Form, otherwise you will stop receiving new orders from tomorrow.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowPvPopup(false);
                    navigate('/delivery/profile');
                  }}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Upload Document Now
                </button>
                <button
                  onClick={() => setShowPvPopup(false)}
                  className="w-full py-4 text-neutral-400 font-bold uppercase tracking-widest hover:text-neutral-600"
                >
                  I'll do it later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

