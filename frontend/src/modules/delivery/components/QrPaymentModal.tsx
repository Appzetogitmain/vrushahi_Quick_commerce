import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import vrushahiLogo from '@assets/vrumarket-logo/WhatsApp_Image_2026-07-29_at_16.30.56-removebg-preview (1).png';

interface QrPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrString: string;
    amount: number;
    orderNumber: string;
    expiresAt?: Date;
    paymentStatus: 'none' | 'pending' | 'paid' | 'failed';
}

const Icons = {
    X: ({ size = 24 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    CheckCircle: ({ size = 24 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Clock: ({ size = 24 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    AlertCircle: ({ size = 24 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
};

export default function QrPaymentModal({ isOpen, onClose, qrString, amount, orderNumber, expiresAt, paymentStatus }: QrPaymentModalProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(expiresAt).getTime() - now;

            if (distance < 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
            } else {
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div key="qr-payment-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                                <div>
                                    <h3 className="font-bold text-neutral-900">QR Payment</h3>
                                    <p className="text-[10px] text-neutral-500 font-medium">#{orderNumber}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                                >
                                    <Icons.X size={20} />
                                </button>
                            </div>

                            <div className="p-6 flex flex-col items-center text-center">
                                {paymentStatus === 'paid' ? (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="py-12 flex flex-col items-center"
                                    >
                                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                            <Icons.CheckCircle size={48} />
                                        </div>
                                        <h4 className="text-2xl font-black text-neutral-900">Payment Successful!</h4>
                                        <p className="text-neutral-500 mt-2">The order has been marked as PAID.</p>
                                    </motion.div>
                                ) : paymentStatus === 'failed' ? (
                                    <div className="py-8 flex flex-col items-center w-full">
                                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                            <Icons.AlertCircle size={32} />
                                        </div>
                                        <h4 className="text-xl font-bold text-neutral-900">Payment Failed</h4>
                                        <p className="text-neutral-500 mt-1 mb-6">Something went wrong with the transaction.</p>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold"
                                        >
                                            Retry Payment
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-6">
                                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Scan to Pay</p>
                                            <p className="text-3xl font-black text-neutral-900">₹{amount}</p>
                                        </div>

                                        {/* QR Code Frame */}
                                        <div className="relative p-6 bg-white border-2 border-neutral-100 rounded-[2.5rem] shadow-inner mb-6 group">
                                            <div className="absolute inset-0 bg-neutral-50 rounded-[2.5rem] -z-0 opacity-50"></div>
                                            <div className="relative z-10 bg-white p-4 rounded-3xl shadow-sm border border-neutral-50">
                                                <QRCodeSVG
                                                    value={qrString}
                                                    size={200}
                                                    level="H"
                                                    includeMargin={false}
                                                    imageSettings={{
                                                        src: vrushahiLogo,
                                                        x: undefined,
                                                        y: undefined,
                                                        height: 40,
                                                        width: 40,
                                                        excavate: true,
                                                    }}
                                                />
                                            </div>
                                            
                                            {/* Scanning Animation */}
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_15px_blue] rounded-full animate-scan pointer-events-none"></div>
                                        </div>

                                        <div className="space-y-4 w-full">
                                            <div className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 px-4 rounded-full text-xs font-bold">
                                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                                                WAITING FOR PAYMENT
                                            </div>

                                            {timeLeft && (
                                                <div className={`flex items-center justify-center gap-1.5 text-xs font-bold ${timeLeft === 'Expired' ? 'text-red-500' : 'text-neutral-500'}`}>
                                                    <Icons.Clock size={14} />
                                                    QR EXPIRES IN: <span className="font-mono text-sm">{timeLeft}</span>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-neutral-400 leading-tight px-4">
                                                Keep this screen open while the customer makes the payment. 
                                                The screen will auto-update on success.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </>
    );
}

// Trigger redeploy
