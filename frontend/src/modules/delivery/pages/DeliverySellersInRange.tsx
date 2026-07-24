import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getSellersInRadius } from '../../../services/api/delivery/deliveryService';
import { useDeliveryStatus } from '../context/DeliveryStatusContext';

export default function DeliverySellersInRange() {
  const navigate = useNavigate();
  const { isOnline, sellersInRange, isLoadingSellers, locationError } = useDeliveryStatus();
  const [error, setError] = useState('');

  useEffect(() => {
    if (locationError) {
      setError(locationError);
    }
  }, [locationError]);

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center pb-20 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">You are Offline</h2>
          <p className="text-neutral-500 mb-6">Go online to see sellers in your current service area.</p>
          <button
            onClick={() => navigate('/delivery')}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />

      <div className="px-4 py-4">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors bg-white shadow-sm border border-neutral-200"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h2 className="text-neutral-900 text-xl font-bold">Sellers in Range</h2>
            <p className="text-xs text-neutral-500">Showing stores that include your current location</p>
          </div>
        </div>

        {isLoadingSellers ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-500 text-sm">Updating sellers in range...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl border border-orange-100 bg-[#FFF9F2] shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FFEFE5] text-orange-500 rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Location Access Required</h3>
              </div>
              <div className="opacity-20 translate-x-2 -translate-y-1">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-orange-900">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
            </div>
            
            <p className="text-[13px] text-gray-700 font-medium mb-3 leading-snug pr-2">
              To track which sellers are in your service range, the app requires access to your location while you are online.
            </p>
            
            <div className="bg-white p-3 rounded-xl shadow-sm border border-orange-50">
              <h4 className="text-[13px] font-bold text-gray-900 mb-2">How to enable in your device settings:</h4>
              <ul className="space-y-1.5 text-[12px] text-gray-600 font-medium list-disc pl-4 marker:text-gray-400">
                <li>Open your device <span className="font-bold text-gray-800">Settings</span></li>
                <li>Navigate to <span className="font-bold text-gray-800">Privacy & Security</span> &gt; <span className="font-bold text-gray-800">Location Services</span></li>
                <li>Select this app and set access to <span className="font-bold text-gray-800">"While Using the App"</span></li>
              </ul>
            </div>
          </div>
        ) : sellersInRange.length > 0 ? (
          <div className="space-y-4">
            {sellersInRange.map((seller) => (
              <div
                key={seller._id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 hover:border-teal-200 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-neutral-900 font-bold text-base">{seller.storeName}</h3>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-bold rounded-full border border-teal-100">
                        IN RANGE
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="truncate">{seller.address || 'Address not available'}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Distance</span>
                        <span className="text-sm font-bold text-neutral-700">
                          {(seller.distanceFromDeliveryBoy / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Service Radius</span>
                        <span className="text-sm font-bold text-neutral-700">
                          {seller.serviceRadiusKm} km
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center text-teal-600 group-hover:bg-teal-50 transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-neutral-200 shadow-sm">
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">No Sellers Found</h3>
            <p className="text-neutral-500 text-sm">You are not currently within any seller's service radius.</p>
          </div>
        )}
      </div>

      <DeliveryBottomNav />
    </div>
  );
}
