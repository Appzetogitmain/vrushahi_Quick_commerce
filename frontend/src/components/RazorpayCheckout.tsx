import React, { useEffect, useRef } from 'react';
import { createRazorpayOrder, verifyPayment } from '../services/api/paymentService';

interface RazorpayCheckoutProps {
    orderId: string;
    amount: number;
    onSuccess: (paymentId: string) => void;
    onFailure: (error: string) => void;
    customerDetails: {
        name: string;
        email: string;
        phone: string;
    };
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
    orderId,
    amount,
    onSuccess,
    onFailure,
    customerDetails,
}) => {
    const paymentInitiated = useRef(false);
    const callbacksRef = useRef({ onSuccess, onFailure, customerDetails });

    // Always keep callback and customer details refs updated on each render
    useEffect(() => {
        callbacksRef.current = { onSuccess, onFailure, customerDetails };
    }, [onSuccess, onFailure, customerDetails]);

    useEffect(() => {
        // Prevent initiating payment multiple times on the same mount
        if (paymentInitiated.current) {
            return;
        }
        paymentInitiated.current = true;

        // Load Razorpay script if not already loaded
        const loadRazorpayScript = () => {
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

        const initiatePayment = async () => {
            try {
                // Load Razorpay script
                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded) {
                    callbacksRef.current.onFailure('Failed to load Razorpay SDK');
                    return;
                }

                // Create Razorpay order
                const orderResponse = await createRazorpayOrder(orderId);

                if (!orderResponse.success) {
                    callbacksRef.current.onFailure(orderResponse.message || 'Failed to create payment order');
                    return;
                }

                const { razorpayOrderId, razorpayKey } = orderResponse.data;

                // Razorpay options
                const options = {
                    key: razorpayKey, // Get key from backend response
                    amount: amount * 100, // Amount in paise
                    currency: 'INR',
                    name: 'vrushahi',
                    description: `Order #${orderId}`,
                    order_id: razorpayOrderId,
                    prefill: {
                        name: callbacksRef.current.customerDetails.name,
                        email: callbacksRef.current.customerDetails.email,
                        contact: callbacksRef.current.customerDetails.phone,
                    },
                    theme: {
                        color: '#16a34a', // vrushahi green
                    },
                    handler: async function (response: any) {
                        try {
                            // Verify payment with backend
                            const verificationResponse = await verifyPayment({
                                orderId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            });

                            if (verificationResponse.success) {
                                callbacksRef.current.onSuccess(response.razorpay_payment_id);
                            } else {
                                callbacksRef.current.onFailure(verificationResponse.message || 'Payment verification failed');
                            }
                        } catch (error: any) {
                            console.error('Payment verification error:', error);
                            callbacksRef.current.onFailure(error.response?.data?.message || 'Payment verification failed');
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            callbacksRef.current.onFailure('Payment cancelled by user');
                        },
                    },
                };

                const razorpay = new window.Razorpay(options);
                razorpay.open();
            } catch (error: any) {
                console.error('Payment initiation error:', error);
                callbacksRef.current.onFailure(error.response?.data?.message || 'Failed to initiate payment');
            }
        };

        initiatePayment();
    }, [orderId, amount]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Initiating Payment...</h3>
                    <p className="text-gray-600">Please wait while we redirect you to the payment gateway</p>
                </div>
            </div>
        </div>
    );
};

export default RazorpayCheckout;
