import React, { useState, useEffect, useRef } from 'react';
import { getActiveSubscriptionPlans, getMySubscription, createSubscriptionPaymentOrder, verifySubscriptionPayment, switchModelToCommission } from '../../../services/api/subscription/sellerSubscriptionService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SellerSubscription() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [mySubscription, setMySubscription] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, mySubRes] = await Promise.all([
        getActiveSubscriptionPlans(),
        getMySubscription()
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (mySubRes.success) setMySubscription(mySubRes.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load subscription data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingPayment(true);
    try {
      const resLoaded = await loadRazorpayScript();
      if (!resLoaded) {
        showToast("Razorpay SDK failed to load", "error");
        setProcessingPayment(false);
        return;
      }

      const orderRes = await createSubscriptionPaymentOrder(planId);
      if (!orderRes.success) {
        showToast("Failed to initiate payment", "error");
        setProcessingPayment(false);
        return;
      }

      const { razorpayOrderId, amount, currency, planDetails, razorpayKey } = orderRes.data;

      const options = {
        key: razorpayKey || 'rzp_test_YourTestKey',
        amount: amount,
        currency: currency,
        name: "vrushahi Seller Subscription",
        description: `Subscription: ${planDetails.name}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            showToast("Payment successful. Verifying...", "success");
            const verifyRes = await verifySubscriptionPayment({
              planId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              showToast("Subscription activated!", "success");
              // Wait a bit, then refresh data. 
              // We could also update user context if needed.
              fetchData();
              // A full reload might be needed to reset the app state if the user was Payment Pending
              if (user?.status === 'Payment Pending') {
                window.location.href = '/seller/dashboard';
              }
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            showToast("Payment verification failed", "error");
          }
        },
        prefill: {
          name: user?.sellerName || '',
          email: user?.email || '',
          contact: user?.mobile || ''
        },
        theme: {
          color: "#16a34a"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        showToast(`Payment failed: ${response.error.description}`, "error");
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      showToast("Error processing payment", "error");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSwitchToCommission = async () => {
    if (!window.confirm("Are you sure you want to switch to the Commission model instantly? Your active subscription will be cancelled.")) return;
    
    try {
      const res = await switchModelToCommission();
      if (res.success) {
        showToast("Switched to Commission model", "success");
        fetchData();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to switch business model", "error");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading subscription details...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">My Subscription</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage your business model and active plans</p>
        </div>
      </div>

      {mySubscription && mySubscription.businessModel === 'Commission' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-800">Current Model: Commission Based</h2>
          <p className="text-neutral-500 text-sm mt-2">
            You are currently on the commission-based model, paying a percentage on successful orders.
            You can switch to a Subscription plan at any time below.
          </p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-neutral-800">Current Model: Subscription Based</h2>
          {mySubscription?.currentSubscription ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-green-900">{mySubscription.currentSubscription.planName}</p>
                <p className="text-sm text-green-700">Expires on: {new Date(mySubscription.currentSubscription.expiryDate).toLocaleDateString()}</p>
              </div>
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                Active
              </span>
            </div>
          ) : (
             <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 font-medium">
               Your subscription has expired or payment is pending. Please subscribe to a plan to keep your shop active.
             </div>
          )}
          {!mySubscription?.currentSubscription && (
            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={handleSwitchToCommission}
                className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Switch to Commission Model
              </button>
            </div>
          )}
        </div>
      )}

      {(!mySubscription?.currentSubscription || mySubscription.businessModel === 'Commission' || mySubscription?.subscriptionStatus === 'Expired') && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-800 mb-6">Available Plans</h2>
          {plans.length === 0 ? (
            <p className="text-neutral-500">No active plans found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan._id} className="border-2 border-neutral-100 hover:border-green-500 bg-white rounded-2xl p-6 transition-all flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-neutral-800">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-green-600">₹{plan.discountedPrice}</span>
                      <span className="text-sm font-medium text-neutral-500">/ {plan.duration} days</span>
                    </div>
                    {plan.actualPrice > plan.discountedPrice && (
                      <p className="text-sm text-neutral-400 line-through mt-1">₹{plan.actualPrice}</p>
                    )}
                    {plan.savings > 0 && (
                      <div className="mt-3 inline-block bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        Save ₹{plan.savings}
                      </div>
                    )}
                    {plan.description && (
                      <p className="mt-4 text-sm text-neutral-600">{plan.description}</p>
                    )}
                  </div>
                  <div className="mt-8 pt-6 border-t border-neutral-100">
                    <button
                      disabled={processingPayment}
                      onClick={() => handleSubscribe(plan._id)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-green-200 disabled:opacity-50"
                    >
                      Subscribe Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mySubscription?.history && mySubscription.history.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-800 mb-4">Subscription History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mySubscription.history.map((record: any) => (
                  <tr key={record._id}>
                    <td className="px-4 py-3 text-neutral-800 font-medium">{record.planName}</td>
                    <td className="px-4 py-3 text-neutral-600">₹{record.amount}</td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        record.status === 'Active' ? 'bg-green-100 text-green-700' :
                        record.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
