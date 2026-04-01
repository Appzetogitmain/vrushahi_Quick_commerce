import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAddresses, deleteAddress, Address } from '../../services/api/customerAddressService';
import Button from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function Addresses() {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const res = await getAddresses();
            if (res.success && Array.isArray(res.data)) {
                setAddresses(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const handleDelete = async (id: string | undefined) => {
        if (!id) return;
        if (!window.confirm('Are you sure you want to delete this address?')) return;

        try {
            await deleteAddress(id);
            setAddresses(addresses.filter(a => a._id !== id));
        } catch (error) {
            console.error('Failed to delete address:', error);
        }
    };

    return (
        <div className="pb-24 md:pb-8 bg-white min-h-screen">
            <header className="sticky top-0 z-[100] bg-white border-b border-neutral-100 px-4 py-2 flex items-center gap-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Back"
                        className="w-10 h-10 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-colors"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18 9 12l6-6" />
                        </svg>
                    </button>
                    <h1 className="text-sm font-bold text-neutral-900 tracking-tight">Saved Addresses</h1>
                </div>
                <Button
                    onClick={() => navigate('/checkout/address')}
                    className="bg-[#ff3269] text-white rounded-xl text-xs font-bold px-4 py-2 hover:bg-[#ff1f5a] shadow-lg shadow-pink-100 transition-all active:scale-95 border-none"
                >
                    ADD NEW
                </Button>
            </header>

            <div className="px-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff3269]"></div>
                    </div>
                ) : addresses.length > 0 ? (
                    <div className="space-y-4">
                        {addresses.map((addr) => (
                            <motion.div
                                key={addr._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl border border-neutral-100 bg-white relative hover:shadow-xl hover:shadow-purple-100 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                        {addr.type === 'Home' ? '🏠' : addr.type === 'Work' ? '🏢' : '📍'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-base font-bold text-neutral-900 tracking-tight group-hover:text-[#ff3269] transition-colors">{addr.fullName}</h3>
                                            <span className="text-[10px] font-bold bg-neutral-100 px-2 py-0.5 rounded-full uppercase text-neutral-600">
                                                {addr.type}
                                            </span>
                                            {addr.isDefault && (
                                                <span className="text-[10px] font-bold bg-[#ff3269] text-white px-2 py-0.5 rounded-full uppercase shadow-sm shadow-pink-100">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-600 mb-1">{addr.address}</p>
                                        <p className="text-sm text-neutral-600 mb-1">{addr.city}, {addr.pincode}</p>
                                        <p className="text-sm font-bold text-neutral-900 mt-2 tracking-tight">📞 {addr.phone}</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-4">
                                    <button
                                        onClick={() => handleDelete(addr._id)}
                                        className="text-xs font-bold text-neutral-500 hover:text-red-500 uppercase tracking-widest transition-colors"
                                    >
                                        Delete
                                    </button>
                                    <button className="text-xs font-bold text-purple-600 hover:text-purple-700 uppercase tracking-widest transition-colors">
                                        Edit
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-neutral-500">
                        <div className="text-6xl mb-4">📍</div>
                        <h2 className="text-lg font-bold text-neutral-900 mb-2">No saved addresses</h2>
                        <p className="text-sm mb-6">Add an address to start ordering</p>
                        <Button
                            onClick={() => navigate('/checkout/address')}
                            className="bg-[#ff3269] text-white rounded-xl px-10 py-3 font-bold transition-all hover:bg-[#ff1f5a] shadow-lg shadow-pink-100 active:scale-95 border-none"
                        >
                            Add New Address
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
