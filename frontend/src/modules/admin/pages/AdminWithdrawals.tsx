import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Filter, 
    Download, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Eye, 
    Calendar,
    ArrowUpRight,
    Wallet,
    CreditCard,
    User,
    Info,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Check,
    X,
    AlertCircle,
    Banknote,
    QrCode
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import {
    getWithdrawalRequests,
    getWithdrawalStats,
    approveWithdrawal,
    rejectWithdrawal,
    WithdrawalRequest,
    WithdrawalStats
} from '../../../services/api/admin/adminWalletService';

export default function AdminWithdrawals() {
    const { showToast } = useToast();
    
    // Data State
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [stats, setStats] = useState<WithdrawalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    
    // Filter State
    const [activeTab, setActiveTab] = useState('All'); // All, Pending, Approved, Rejected
    const [userTypeFilter, setUserTypeFilter] = useState('All'); // All, SELLER, DELIVERY_BOY
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    // Modal State
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // Form State
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [approveData, setApproveData] = useState({
        transactionReference: '',
        adminNotes: ''
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, requestsRes] = await Promise.all([
                getWithdrawalStats(),
                getWithdrawalRequests({
                    page: pagination.page,
                    status: activeTab === 'All' ? undefined : activeTab,
                    userType: userTypeFilter === 'All' ? undefined : userTypeFilter,
                    search: searchQuery || undefined,
                    startDate: dateRange.start || undefined,
                    endDate: dateRange.end || undefined
                })
            ]);

            if (statsRes.success) setStats(statsRes.data);
            if (requestsRes.success) {
                setWithdrawals(requestsRes.data.requests);
                setPagination(requestsRes.data.pagination);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to load withdrawal data', 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab, userTypeFilter, searchQuery, dateRange, pagination.page, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async () => {
        if (!selectedWithdrawal) return;
        if (!approveData.transactionReference) {
            showToast('Transaction Reference ID is required', 'error');
            return;
        }

        try {
            setIsProcessing(true);
            const res = await approveWithdrawal(selectedWithdrawal._id, {
                transactionReference: approveData.transactionReference,
                remarks: approveData.adminNotes
            });

            if (res.success) {
                showToast('Withdrawal approved and processed', 'success');
                setShowApproveModal(false);
                setSelectedWithdrawal(null);
                setApproveData({ transactionReference: '', adminNotes: '' });
                fetchData();
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to approve withdrawal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedWithdrawal) return;
        if (!rejectReason) {
            showToast('Rejection reason is required', 'error');
            return;
        }

        try {
            setIsProcessing(true);
            const res = await rejectWithdrawal(selectedWithdrawal._id, rejectReason);

            if (res.success) {
                showToast('Withdrawal request rejected', 'success');
                setShowRejectModal(false);
                setSelectedWithdrawal(null);
                setRejectReason('');
                fetchData();
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to reject withdrawal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock size={12} /> Pending</span>;
            case 'Approved':
            case 'Completed':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle size={12} /> Approved</span>;
            case 'Rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700"><XCircle size={12} /> Rejected</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    const getUserTypeBadge = (type: string) => {
        if (type === 'SELLER') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">Seller</span>;
        }
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-50 text-orange-600 border border-orange-100">Rider</span>;
    };

    const getPaymentIcon = (method: string) => {
        switch (method?.toLowerCase()) {
            case 'upi': return <QrCode size={14} className="text-purple-500" />;
            case 'bank transfer': return <Banknote size={14} className="text-blue-500" />;
            case 'cash': return <Wallet size={14} className="text-emerald-500" />;
            default: return <CreditCard size={14} className="text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Withdrawal Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage payout requests from sellers and riders efficiently.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchData()}
                        className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                        title="Refresh Data"
                    >
                        <ArrowUpRight size={18} className="rotate-45" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard 
                    title="Total Requests" 
                    value={stats?.totalRequests || 0} 
                    icon={<CreditCard className="text-blue-600" size={20} />}
                    color="blue"
                />
                <SummaryCard 
                    title="Pending Requests" 
                    value={stats?.pendingRequests || 0} 
                    icon={<Clock className="text-rose-600" size={20} />}
                    color="rose"
                    isAlert
                />
                <SummaryCard 
                    title="Approved Amount" 
                    value={`₹${stats?.approvedAmount?.toLocaleString('en-IN') || 0}`} 
                    icon={<CheckCircle className="text-emerald-600" size={20} />}
                    color="emerald"
                />
                <SummaryCard 
                    title="Rejected Requests" 
                    value={stats?.rejectedRequests || 0} 
                    icon={<XCircle className="text-gray-600" size={20} />}
                    color="gray"
                />
            </div>

            {/* Admin Guide Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                    <Info size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900 text-sm">Quick Guide: Payout Workflow</h3>
                    <p className="text-blue-800 text-xs mt-1 leading-relaxed">
                        Verify the user's <span className="font-bold">Available Balance</span> before approving. 
                        Once you approve, the amount will be <span className="font-bold">instantly deducted</span> from their wallet. 
                        Ensure you have successfully initiated the transfer via UPI/Bank before entering the Transaction ID.
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs & Filters Header */}
                <div className="p-4 border-b border-gray-100 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-50 rounded-xl w-fit">
                            {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setPagination({ ...pagination, page: 1 }); }}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                        activeTab === tab 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Filters Group */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or ID..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>

                            {/* User Type Filter */}
                            <select 
                                value={userTypeFilter}
                                onChange={(e) => setUserTypeFilter(e.target.value)}
                                className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                            >
                                <option value="All">All Users</option>
                                <option value="SELLER">Sellers Only</option>
                                <option value="DELIVERY_BOY">Riders Only</option>
                            </select>

                            {/* Date Picker (Simplified for demo, could be a real range picker) */}
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    className="px-3 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                                <span className="text-gray-400 text-xs">to</span>
                                <input 
                                    type="date" 
                                    className="px-3 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Request ID</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4 text-right">Requested Amount</th>
                                <th className="px-6 py-4 text-right">Available Balance</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <AlertCircle size={40} className="opacity-20" />
                                            <p className="text-sm font-medium">No withdrawal requests found</p>
                                            <p className="text-xs">Try adjusting your filters or search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                withdrawals.map((req) => (
                                    <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-gray-500">#{req._id.slice(-8).toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-medium">{new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className="text-[10px] text-gray-400 uppercase">{new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
                                                    {(req.userId?.sellerName || req.userId?.name || 'U').charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 font-semibold">{req.userId?.sellerName || req.userId?.storeName || req.userId?.name || 'N/A'}</span>
                                                        {getUserTypeBadge(req.userType)}
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-medium">{req.userId?.mobile || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-900 font-bold">₹{req.amount?.toLocaleString('en-IN')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-xs font-bold ${req.availableBalance && req.availableBalance < req.amount ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{req.availableBalance?.toLocaleString('en-IN') || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                {getPaymentIcon(req.paymentMethod)}
                                                {req.paymentMethod}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {req.status === 'Pending' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => { setSelectedWithdrawal(req); setShowApproveModal(true); }}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                            title="Approve Payout"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => { setSelectedWithdrawal(req); setShowRejectModal(true); }}
                                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                            title="Reject Request"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => { setSelectedWithdrawal(req); setShowDetailsModal(true); }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <p className="text-xs text-gray-500 font-medium">
                        Showing <span className="text-gray-900">{withdrawals.length}</span> of <span className="text-gray-900">{pagination.total}</span> entries
                    </p>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={pagination.page === 1}
                            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            className="p-1 text-gray-400 hover:bg-white hover:shadow-sm rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {[...Array(pagination.pages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPagination({ ...pagination, page: i + 1 })}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    pagination.page === i + 1 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                                    : 'text-gray-500 hover:bg-white hover:shadow-sm'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button 
                            disabled={pagination.page === pagination.pages}
                            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            className="p-1 text-gray-400 hover:bg-white hover:shadow-sm rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showApproveModal && selectedWithdrawal && (
                    <Modal onClose={() => setShowApproveModal(false)} title="Approve Withdrawal Payout">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="User Name" value={selectedWithdrawal.userId?.sellerName || selectedWithdrawal.userId?.name || 'N/A'} />
                                <DetailItem label="User Type" value={selectedWithdrawal.userType === 'SELLER' ? 'Seller' : 'Rider'} />
                                <DetailItem label="Requested Amount" value={`₹${selectedWithdrawal.amount?.toLocaleString('en-IN')}`} isBold />
                                <DetailItem label="Available Balance" value={`₹${selectedWithdrawal.availableBalance?.toLocaleString('en-IN') || 0}`} isAlert={selectedWithdrawal.availableBalance! < selectedWithdrawal.amount} />
                                <DetailItem label="Payment Method" value={selectedWithdrawal.paymentMethod} />
                                <DetailItem label="Bank/UPI Details" value={selectedWithdrawal.accountDetails} isFull />
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Transaction Reference ID <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={approveData.transactionReference}
                                        onChange={(e) => setApproveData({ ...approveData, transactionReference: e.target.value })}
                                        placeholder="e.g. UPI Ref No. or Bank TRN ID"
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Enter the ID provided by your bank after successful transfer.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Admin Notes (Optional)</label>
                                    <textarea 
                                        value={approveData.adminNotes}
                                        onChange={(e) => setApproveData({ ...approveData, adminNotes: e.target.value })}
                                        placeholder="Add any internal remarks..."
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition h-20 resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button 
                                    onClick={() => setShowApproveModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleApprove}
                                    disabled={isProcessing || (selectedWithdrawal.availableBalance! < selectedWithdrawal.amount)}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isProcessing ? 'Processing...' : 'Confirm & Payout'}
                                </button>
                            </div>
                            {selectedWithdrawal.availableBalance! < selectedWithdrawal.amount && (
                                <p className="text-center text-[10px] text-rose-500 font-bold italic mt-2 animate-bounce flex items-center justify-center gap-1">
                                    <AlertCircle size={12} /> Cannot approve: Requested amount exceeds available balance.
                                </p>
                            )}
                        </div>
                    </Modal>
                )}

                {showRejectModal && selectedWithdrawal && (
                    <Modal onClose={() => setShowRejectModal(false)} title="Reject Withdrawal Request">
                        <div className="space-y-4">
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-center">
                                <AlertCircle size={20} className="text-rose-600" />
                                <p className="text-xs text-rose-800 font-medium">You are rejecting a withdrawal request of <span className="font-bold">₹{selectedWithdrawal.amount}</span>. This action is permanent.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Reason for Rejection <span className="text-rose-500">*</span></label>
                                <textarea 
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter detailed reason for rejection..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition h-32 resize-none"
                                ></textarea>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowRejectModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                                >
                                    Go Back
                                </button>
                                <button 
                                    onClick={handleReject}
                                    disabled={isProcessing || !rejectReason}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-50"
                                >
                                    {isProcessing ? 'Processing...' : 'Reject Request'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {showDetailsModal && selectedWithdrawal && (
                    <Modal onClose={() => setShowDetailsModal(false)} title="Withdrawal Details">
                        <div className="space-y-6">
                            {/* Status Header */}
                            <div className={`p-4 rounded-2xl flex items-center justify-between ${
                                selectedWithdrawal.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {selectedWithdrawal.status === 'Rejected' ? <XCircle size={24} /> : <CheckCircle size={24} />}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold tracking-wide uppercase">Request {selectedWithdrawal.status}</span>
                                        <span className="text-[10px] opacity-80">On {selectedWithdrawal.processedAt ? new Date(selectedWithdrawal.processedAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold font-mono">₹{selectedWithdrawal.amount}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DetailItem label="Request ID" value={selectedWithdrawal._id} isFull />
                                <DetailItem label="User Name" value={selectedWithdrawal.userId?.sellerName || selectedWithdrawal.userId?.name || 'N/A'} />
                                <DetailItem label="User Type" value={selectedWithdrawal.userType === 'SELLER' ? 'Seller' : 'Rider'} />
                                <DetailItem label="Payment Method" value={selectedWithdrawal.paymentMethod} />
                                <DetailItem label="Bank/UPI Details" value={selectedWithdrawal.accountDetails} />
                                
                                {selectedWithdrawal.transactionReference && (
                                    <DetailItem label="Transaction ID" value={selectedWithdrawal.transactionReference} isFull color="blue" />
                                )}
                                
                                {selectedWithdrawal.remarks && (
                                    <DetailItem label={selectedWithdrawal.status === 'Rejected' ? 'Rejection Reason' : 'Admin Notes'} value={selectedWithdrawal.remarks} isFull color="gray" />
                                )}

                                {selectedWithdrawal.processedBy && (
                                    <DetailItem label="Processed By" value={selectedWithdrawal.processedBy.name} isFull />
                                )}
                            </div>

                            <button 
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition"
                            >
                                Close Details
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// Sub-components

function SummaryCard({ title, value, icon, color, isAlert }: { title: string, value: string | number, icon: any, color: string, isAlert?: boolean }) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        rose: 'bg-rose-50 text-rose-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        gray: 'bg-gray-50 text-gray-600'
    };

    return (
        <div className={`p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02] ${isAlert ? 'ring-1 ring-rose-200' : ''}`}>
            <div className={`p-3 rounded-xl ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function Modal({ children, onClose, title }: { children: any, onClose: () => void, title: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-base font-bold text-gray-800 tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white rounded-full transition text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

function DetailItem({ label, value, isBold, isAlert, isFull, color }: { label: string, value: string | number, isBold?: boolean, isAlert?: boolean, isFull?: boolean, color?: string }) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        gray: 'bg-gray-50 text-gray-700 border-gray-100',
    };

    return (
        <div className={`flex flex-col gap-1 ${isFull ? 'col-span-2' : ''} ${color ? 'p-3 rounded-xl border ' + colorClasses[color] : ''}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className={`text-sm break-all ${isBold ? 'font-bold' : 'font-semibold'} ${isAlert ? 'text-rose-600' : 'text-gray-800'}`}>
                {value}
            </span>
        </div>
    );
}
