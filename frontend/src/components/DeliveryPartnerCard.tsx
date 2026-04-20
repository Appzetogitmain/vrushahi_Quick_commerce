import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'

interface DeliveryPartner {
    name?: string
    phone?: string
    profileImage?: string
    vehicleNumber?: string
}

interface DeliveryPartnerCardProps {
    partner: DeliveryPartner | null
    eta: number
    distance: number
    isTracking: boolean
    deliveryOtp?: string
    onCall?: () => void
    onMessage?: () => void
}

export default function DeliveryPartnerCard({
    partner,
    eta,
    distance,
    isTracking,
    deliveryOtp,
    onCall,
    onMessage
}: DeliveryPartnerCardProps) {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopyOtp = useCallback(async () => {
        if (!deliveryOtp) return
        try {
            await navigator.clipboard.writeText(deliveryOtp)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy OTP:', err)
        }
    }, [deliveryOtp])

    if (!partner && !isTracking) return null

    const formatETA = (minutes: number): string => {
        if (minutes < 60) {
            return `${minutes} min`
        }
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    return (
        <motion.div
            className="mx-4 mt-4 bg-white rounded-xl shadow-sm overflow-hidden border border-violet-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            {/* Delivery Partner Info */}
            <div className="p-3">
                <div className="flex items-center gap-3">
                    {/* Profile Image */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-[#8b5cf6] flex items-center justify-center overflow-hidden shadow-sm shadow-violet-100">
                        {partner?.profileImage ? (
                            <img
                                src={partner.profileImage}
                                alt={partner.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xl text-white">🛵</span>
                        )}
                    </div>

                    {/* Partner Details */}
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                            {partner?.name || 'Assigning Partner...'}
                        </h3>
                        {partner?.vehicleNumber && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                🏍️ {partner.vehicleNumber}
                            </p>
                        )}
                        {isTracking && (
                            <div className="flex items-center gap-1 mt-1">
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"
                                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span className="text-[10px] text-[#8b5cf6] font-bold uppercase tracking-wider">
                                    Live track
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ETA Section Right Side */}
                    {isTracking && (
                        <div className="flex flex-col items-end justify-center pr-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ETA</span>
                            <span className="text-lg font-black text-gray-900">{formatETA(eta)}</span>
                        </div>
                    )}

                    {/* Call Button */}
                    {partner?.phone && onCall && (
                        <motion.button
                            className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center hover:bg-violet-100 transition-colors shadow-sm ml-1"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCall}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Delivery OTP Section - Permanent OTP, no expiry, Only visible when partner is assigned */}
            {deliveryOtp && partner && (
                <div className="mx-3 mb-3 p-2 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-violet-100 shadow-sm flex items-center justify-between group">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mb-0.5">Delivery OTP</span>
                                <span className="text-xl font-black tracking-[0.2em] text-[#8b5cf6]">{deliveryOtp}</span>
                            </div>
                            <motion.button
                                onClick={handleCopyOtp}
                                className="p-1.5 hover:bg-neutral-50 rounded-md transition-colors relative"
                                whileTap={{ scale: 0.9 }}
                            >
                                <AnimatePresence mode="wait">
                                    {isCopied ? (
                                        <motion.svg
                                            key="check"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"
                                        >
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </motion.svg>
                                    ) : (
                                        <motion.svg
                                            key="copy"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
                                        >
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </motion.svg>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

