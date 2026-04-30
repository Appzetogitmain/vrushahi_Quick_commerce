import { useState, useEffect, useCallback } from 'react';
import { 
    getDeliverySettlementStats, 
    getWalletTransactions, 
    DeliverySettlementStats,
    WalletTransaction 
} from '../../../services/api/admin/adminWalletService';
import { getDeliveryBoys, DeliveryBoy } from '../../../services/api/admin/adminDeliveryService';
import DeliverySettlementSummaryCards from '../components/DeliverySettlementSummaryCards';
import DeliverySettlementModal from '../components/DeliverySettlementModal';
import { useToast } from '../../../context/ToastContext';

export default function AdminFundTransfer() {
    const { showToast } = useToast();
    const [stats, setStats] = useState<DeliverySettlementStats>({
        totalPartnerEarnings: 0,
        paidToPartner: 0,
        partnerWalletBalance: 0
    });
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Filters
    const [selectedBoyId, setSelectedBoyId] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEntries, setTotalEntries] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                limit: entriesPerPage,
                userType: 'DELIVERY_BOY'
            };

            if (selectedBoyId !== 'all') {
                // In WalletTransaction, we filter by userId if we want a specific partner's transactions
                // But the backend getWalletTransactions might need a specific filter for userId
                // For now, let's assume we filter by description or just get all for DELIVERY_BOY
                // Actually, let's refine this if the API supports userId filter
            }

            if (selectedType !== 'all') {
                params.type = selectedType;
            }

            const response = await getWalletTransactions(params);
            if (response.success) {
                setTransactions(response.data);
                if (response.pagination) {
                    setTotalPages(response.pagination.pages);
                    setTotalEntries(response.pagination.total);
                }
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showToast('Failed to fetch transactions', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, entriesPerPage, selectedBoyId, selectedType, showToast]);

    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const response = await getDeliverySettlementStats(selectedBoyId === 'all' ? undefined : selectedBoyId);
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    }, [selectedBoyId]);

    const fetchDeliveryBoys = useCallback(async () => {
        try {
            const response = await getDeliveryBoys({ limit: 1000 });
            if (response.success) {
                setDeliveryBoys(response.data);
            }
        } catch (error) {
            console.error('Error fetching delivery boys:', error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchDeliveryBoys();
    }, [fetchDeliveryBoys]);

    const handleExport = () => {
        // Implementation for export
        const headers = ['Date', 'Type', 'Details', 'Amount', 'Status'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(t => [
                new Date(t.createdAt).toLocaleDateString(),
                t.type,
                `"${t.description}"`,
                t.amount,
                t.status
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rider-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getTransactionLabel = (description: string) => {
        if (description.toLowerCase().includes('withdrawal')) return 'Withdrawal';
        if (description.toLowerCase().includes('bonus')) return 'Delivery Bonus';
        if (description.toLowerCase().includes('payout')) return 'Payout';
        if (description.toLowerCase().includes('proceeds')) return 'Order Earning';
        return 'Other';
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-teal-600 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg sticky top-0 z-20">
                <div>
                    <h1 className="text-white text-2xl font-bold tracking-tight">Delivery Boy Wallet & Transactions</h1>
                    <p className="text-teal-50 text-sm mt-1 opacity-90">Manage rider earnings, payouts and view history</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-white text-teal-700 hover:bg-teal-50 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Fund Transfer
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Vrushahi Hint */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-xl flex items-center gap-3 shadow-sm">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-700">
                        <span className="font-bold">Vrushahi Tip:</span> Use the <span className="font-bold">Add Fund Transfer</span> button to manually process payouts or settle earnings for delivery partners.
                    </p>
                </div>

                {/* Stats Summary */}
                <DeliverySettlementSummaryCards stats={stats} loading={statsLoading} />


                {/* Main Filter & Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                    {/* Filter Section */}
                    <div className="p-6 border-b border-neutral-100 bg-white/50 backdrop-blur-sm">
                        <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                                {/* Delivery Partner Filter */}
                                <div className="flex-1 md:w-64">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Delivery Partner</label>
                                    <select
                                        value={selectedBoyId}
                                        onChange={(e) => {
                                            setSelectedBoyId(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">All Partners</option>
                                        {deliveryBoys.map(boy => (
                                            <option key={boy._id} value={boy._id}>{boy.name} ({boy.mobile})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Type Filter */}
                                <div className="flex-1 md:w-48">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Type</label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => {
                                            setSelectedType(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">All Transactions</option>
                                        <option value="Credit">Credit (+)</option>
                                        <option value="Debit">Debit (-)</option>
                                    </select>
                                </div>

                                {/* Search Filter */}
                                <div className="flex-1 md:w-72">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Search</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search by ID, Order or Remark..."
                                            className="w-full px-4 py-2.5 pl-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                        />
                                        <svg className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto self-end xl:self-center">
                                <button
                                    onClick={handleExport}
                                    className="flex-1 sm:flex-none px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Export
                                </button>
                                <div className="flex items-center gap-2 border border-neutral-200 px-3 py-2 rounded-xl bg-neutral-50">
                                    <span className="text-xs font-bold text-neutral-500 uppercase">Per Page:</span>
                                    <select
                                        value={entriesPerPage}
                                        onChange={(e) => {
                                            setEntriesPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent text-sm font-bold text-neutral-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Transaction Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Details / Reference</th>
                                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
                                                <span className="text-neutral-500 text-sm font-medium">Loading transactions...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-2">
                                                    <svg className="w-6 h-6 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-neutral-500 font-medium">No transactions found</span>
                                                <span className="text-neutral-400 text-xs">Try adjusting your filters or search term</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions
                                        .filter(t => 
                                            t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (t.userName && t.userName.toLowerCase().includes(searchTerm.toLowerCase()))
                                        )
                                        .map((t) => (
                                            <tr key={t._id} className="hover:bg-neutral-50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-neutral-700">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${t.type === 'Credit' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        <span className="text-sm font-bold text-neutral-700">{getTransactionLabel(t.description)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-xs">
                                                        <span className="text-sm font-medium text-neutral-700 line-clamp-1">{t.description}</span>
                                                        <span className="text-xs font-mono text-neutral-400 mt-0.5">{t.reference}</span>
                                                        {t.userName && <span className="text-[10px] font-bold text-teal-600 mt-1 uppercase tracking-wider">{t.userName}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-sm font-bold ${t.type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === 'Credit' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                                                        t.status === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                                        t.status === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                                                        'bg-red-100 text-red-700 border border-red-200'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-neutral-500">
                            Showing <span className="font-bold text-neutral-700">{(currentPage - 1) * entriesPerPage + 1}</span> to <span className="font-bold text-neutral-700">{Math.min(currentPage * entriesPerPage, totalEntries)}</span> of <span className="font-bold text-neutral-700">{totalEntries}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || loading}
                                className="p-2 border border-neutral-200 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <div className="flex items-center px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-teal-700 shadow-sm">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || loading}
                                className="p-2 border border-neutral-200 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Copy */}
                <div className="text-center pb-8">
                    <p className="text-sm text-neutral-400 font-medium">
                        Copyright © 2026. Developed By <span className="text-teal-600 font-bold">Vrushahi Market</span> your own & reliable store
                    </p>
                </div>
            </div>

            {/* Payout Modal */}
            <DeliverySettlementModal 
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                    fetchData();
                    fetchStats();
                }}
                deliveryBoys={deliveryBoys}
            />
        </div>
    );
}
