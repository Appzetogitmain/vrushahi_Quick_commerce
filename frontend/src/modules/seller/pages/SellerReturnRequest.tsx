import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getReturnRequests, ReturnRequest, GetReturnRequestsParams, updateReturnStatus } from '../../../services/api/returnService';

export default function SellerReturnRequest() {
    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [totalEntries, setTotalEntries] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    // Fetch return requests from API
    const fetchReturnRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const params: GetReturnRequestsParams = {
                page: currentPage,
                limit: rowsPerPage,
                sortBy: sortColumn || 'date',
                sortOrder: sortDirection,
            };

            // Parse date range
            if (fromDate && toDate) {
                params.dateFrom = fromDate;
                params.dateTo = toDate;
            }

            // Add status filter
            if (statusFilter !== 'All Status') {
                params.status = statusFilter;
            }

            // Add search
            if (searchTerm) {
                params.search = searchTerm;
            }

            const response = await getReturnRequests(params);
            if (response.success && response.data) {
                setReturnRequests(response.data);
                // Extract pagination metadata from backend if available
                const responseData = response as any;
                if (responseData.pagination) {
                    setTotalEntries(responseData.pagination.total);
                    setTotalPages(responseData.pagination.pages);
                } else {
                    setTotalEntries(response.data.length);
                    setTotalPages(Math.ceil(response.data.length / rowsPerPage));
                }
            } else {
                setError(response.message || 'Failed to fetch return requests');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch return requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturnRequests();
    }, [fromDate, toDate, statusFilter, searchTerm, currentPage, rowsPerPage, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ column }: { column: string }) => (
        <span className="text-neutral-400 text-[10px]">
            {sortColumn === column ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
    );

    const handleClearDates = () => {
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    // Handle status changes (Approve / Reject)
    const handleStatusUpdate = async (id: string, newStatus: 'Approved' | 'Rejected' | 'Completed') => {
        setActionLoading(true);
        setActionError('');
        try {
            const response = await updateReturnStatus(id, { status: newStatus });
            if (response.success) {
                // Update local list state
                setReturnRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
                setIsModalOpen(false);
                setSelectedRequest(null);
                alert(`Return request status successfully updated to ${newStatus}!`);
                fetchReturnRequests(); // full reload to align counts
            } else {
                setActionError(response.message || 'Failed to update status');
            }
        } catch (err: any) {
            setActionError(err.response?.data?.message || err.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const displayedRequests = returnRequests;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + displayedRequests.length;

    return (
        <div className="flex flex-col h-full min-h-screen bg-neutral-50 font-sans">
            {/* Top Navigation/Header */}
            <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-neutral-800">Return Requests</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <Link to="/seller" className="text-green-600 hover:text-green-700 font-medium transition-colors">
                            Home
                        </Link>
                        <span className="text-neutral-400">/</span>
                        <span className="text-neutral-500 font-medium">Return Requests</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex flex-col overflow-hidden">
                    {/* Section Header - Green Banner */}
                    <div className="bg-green-600 text-white px-4 sm:px-6 py-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            Manage Return Requests
                        </h2>
                    </div>

                    {/* Controls Panel */}
                    <div className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-100 bg-neutral-50/50">
                        {/* Left Side: Date Range and Status Filter */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full lg:w-auto">
                            {/* Date Range Filter */}
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-sm font-medium text-neutral-600">From:</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-shadow shadow-sm"
                                />
                                <label className="text-sm font-medium text-neutral-600">To:</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-shadow shadow-sm"
                                />
                                <button
                                    onClick={handleClearDates}
                                    className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-neutral-600 whitespace-nowrap">Status:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none cursor-pointer transition-shadow shadow-sm"
                                >
                                    <option value="All Status">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Side: Per Page, Export, Search */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            {/* Per Page */}
                            <div className="flex items-center gap-2 justify-between">
                                <span className="text-sm font-medium text-neutral-600 whitespace-nowrap">Show:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-neutral-300 rounded-lg py-1.5 px-3 text-sm font-medium text-neutral-700 focus:ring-1 focus:ring-green-500 focus:outline-none cursor-pointer transition-shadow shadow-sm"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                            {/* Export Button */}
                            <button
                                onClick={() => {
                                    const headers = ['Order Item Id', 'Product', 'Variant', 'Price', 'Disc Price', 'Quantity', 'Total', 'Status', 'Date'];
                                    const csvContent = [
                                        headers.join(','),
                                        ...returnRequests.map(request => [
                                            request.orderItemId,
                                            `"${request.product}"`,
                                            `"${request.variant}"`,
                                            request.price,
                                            request.discPrice,
                                            request.quantity,
                                            request.total,
                                            `"${request.status}"`,
                                            request.date
                                        ].join(','))
                                    ].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    const url = URL.createObjectURL(blob);
                                    link.setAttribute('href', url);
                                    link.setAttribute('download', `return_requests_${new Date().toISOString().split('T')[0]}.csv`);
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Export CSV
                            </button>

                            {/* Search */}
                            <div className="relative flex-1 sm:flex-initial">
                                <input
                                    type="text"
                                    className="pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none w-full sm:w-48 transition-shadow shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search request..."
                                />
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Loading and Error States */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                            <div className="text-neutral-500 text-sm mt-4 font-medium animate-pulse">Loading return requests...</div>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4 text-sm font-medium">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-neutral-200">
                            <thead>
                                <tr className="bg-neutral-50 text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('orderItemId')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Order Item Id
                                            <SortIcon column="orderItemId" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('product')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Product
                                            <SortIcon column="product" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('variant')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Variant
                                            <SortIcon column="variant" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('price')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Price
                                            <SortIcon column="price" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('discPrice')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Disc Price
                                            <SortIcon column="discPrice" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Quantity
                                            <SortIcon column="quantity" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('total')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Total
                                            <SortIcon column="total" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Status
                                            <SortIcon column="status" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Date
                                            <SortIcon column="date" />
                                        </div>
                                    </th>
                                    <th className="p-4 border-b border-neutral-200">
                                        <div className="flex items-center gap-1">
                                            Action
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {displayedRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-12 text-center text-neutral-500 font-medium">
                                            No data available in table
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRequests.map((request, index) => (
                                        <tr key={index} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="p-4 text-sm text-neutral-600 font-medium font-mono">{request.orderItemId}</td>
                                            <td className="p-4 text-sm text-neutral-800 font-semibold">{request.product}</td>
                                            <td className="p-4 text-sm text-neutral-600">{request.variant}</td>
                                            <td className="p-4 text-sm text-neutral-800 font-medium">₹{request.price.toFixed(2)}</td>
                                            <td className="p-4 text-sm text-neutral-800 font-medium">₹{request.discPrice.toFixed(2)}</td>
                                            <td className="p-4 text-sm text-neutral-600 font-semibold">{request.quantity}</td>
                                            <td className="p-4 text-sm text-green-600 font-bold">₹{request.total.toFixed(2)}</td>
                                            <td className="p-4 text-sm font-medium">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                    request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-neutral-600 font-medium">{request.date}</td>
                                            <td className="p-4 text-sm text-neutral-900">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setIsModalOpen(true);
                                                        setActionError('');
                                                    }}
                                                    className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border border-green-200/50"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-50/50">
                        <div className="text-sm font-medium text-neutral-500">
                            Showing {returnRequests.length === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || totalPages === 0}
                                className="w-9 h-9 flex items-center justify-center border border-neutral-300 bg-white rounded-lg hover:bg-green-50 hover:border-green-300 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-neutral-300 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <span className="text-sm font-semibold text-neutral-700 px-2">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="w-9 h-9 flex items-center justify-center border border-neutral-300 bg-white rounded-lg hover:bg-green-50 hover:border-green-300 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-neutral-300 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Return Request Detail Modal */}
            {isModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Return Request Details
                            </h3>
                            <button 
                                onClick={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                                className="text-white/85 hover:text-white hover:bg-green-700/50 p-1.5 rounded-lg transition-all"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {actionError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">
                                    ⚠️ {actionError}
                                </div>
                            )}

                            {/* Customer and Order summary grids */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 shadow-inner">
                                    <span className="text-xs text-neutral-400 font-bold uppercase block mb-1 tracking-wider">Customer Info</span>
                                    <div className="text-sm font-bold text-neutral-800">{selectedRequest.customerName || 'N/A'}</div>
                                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1 font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        {selectedRequest.customerPhone || 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 shadow-inner">
                                    <span className="text-xs text-neutral-400 font-bold uppercase block mb-1 tracking-wider">Order Details</span>
                                    <div className="text-sm font-bold text-neutral-800">Order: {selectedRequest.orderId || 'N/A'}</div>
                                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1 font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        Requested: {selectedRequest.date || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Product Info Display Card */}
                            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    Item to be Returned
                                </div>
                                <div className="p-4 flex gap-4">
                                    {selectedRequest.image ? (
                                        <img 
                                            src={selectedRequest.image} 
                                            alt={selectedRequest.product} 
                                            className="w-16 h-16 object-cover rounded-xl border border-neutral-200 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-center flex-shrink-0 text-neutral-400">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-neutral-800 truncate">{selectedRequest.product}</h4>
                                        <p className="text-xs text-neutral-500 font-medium mt-0.5">Variant: {selectedRequest.variant || 'Standard Pack'}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs">
                                            <div>Price: <span className="font-semibold text-neutral-700">₹{selectedRequest.price.toFixed(2)}</span></div>
                                            <div>Quantity: <span className="font-semibold text-neutral-700">{selectedRequest.quantity}</span></div>
                                            <div>Total: <span className="font-bold text-green-600 text-sm">₹{selectedRequest.total.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Return Reason Detail */}
                            <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl shadow-sm">
                                <span className="text-xs text-amber-700 font-bold uppercase block mb-1 tracking-wider">Return Reason</span>
                                <div className="text-sm font-bold text-neutral-800">{selectedRequest.returnReason || 'No reason provided'}</div>
                                {selectedRequest.description && (
                                    <div className="text-xs text-neutral-600 mt-2 bg-white/70 p-3 rounded-lg border border-amber-100 leading-relaxed italic">
                                        "{selectedRequest.description}"
                                    </div>
                                )}
                            </div>

                            {/* Rider Custody & Handover Tracking */}
                            <div className="border border-purple-200 bg-purple-50/30 p-4 rounded-xl text-left space-y-3 shadow-sm">
                                <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">🚚 Return Pickup & Custody Tracking</span>
                                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                                        {selectedRequest.pickupStatus || "Pending"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-neutral-500 block">Assigned Delivery Partner:</span>
                                        <span className="font-bold text-neutral-800">{selectedRequest.deliveryBoyName || 'Not Assigned'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block">Product Custody Status:</span>
                                        <span className="font-bold text-neutral-800">{selectedRequest.productCustody || 'With Customer'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block">Customer Handover OTP:</span>
                                        <span className={`font-bold ${selectedRequest.customerOtpVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                            {selectedRequest.customerOtpVerified ? '✅ OTP Verified (Picked up)' : '⏳ Verification Pending'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block">Seller Handover OTP:</span>
                                        <span className={`font-bold ${selectedRequest.sellerOtpVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                            {selectedRequest.sellerOtpVerified ? '✅ OTP Verified (Returned to Seller)' : '⏳ Handover Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Rider QC Inspection Report */}
                            <div className="border border-blue-200 bg-blue-50/30 p-4 rounded-xl text-left space-y-2 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">📋 Rider Quality Check (QC) Inspection</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        selectedRequest.qcStatus === 'Passed' ? 'bg-green-100 text-green-800' :
                                        selectedRequest.qcStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {selectedRequest.qcStatus || 'Pending'}
                                    </span>
                                </div>
                                <div className="text-xs text-neutral-700 bg-white p-2.5 rounded-lg border border-blue-100 min-h-[40px]">
                                    <span className="font-semibold block text-neutral-400 mb-1">QC Inspection Notes:</span>
                                    {selectedRequest.qcNotes || 'No notes provided by rider yet.'}
                                </div>
                            </div>

                            {/* Customer and Rider Uploaded Photos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {selectedRequest.images && selectedRequest.images.length > 0 && (
                                    <div className="border border-neutral-200 rounded-xl p-3 space-y-2 text-left bg-white shadow-sm">
                                        <span className="text-xs text-neutral-500 font-bold uppercase block tracking-wider">Customer Photos</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRequest.images.map((img: string, idx: number) => (
                                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 block hover:opacity-85">
                                                    <img src={img} alt="Customer upload" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.riderImages && selectedRequest.riderImages.length > 0 && (
                                    <div className="border border-teal-200 bg-teal-50/20 rounded-xl p-3 space-y-2 text-left shadow-sm">
                                        <span className="text-xs text-teal-800 font-bold uppercase block tracking-wider">Rider QC Photos</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRequest.riderImages.map((img: string, idx: number) => (
                                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-teal-200 block hover:opacity-85">
                                                    <img src={img} alt="Rider QC upload" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Settlement and Payout Detail */}
                            <div className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-xl text-left space-y-2 shadow-sm">
                                <span className="text-xs font-bold text-emerald-800 uppercase block tracking-wider">💰 Return Fee Settlement</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-neutral-500 block">Return Pickup Fee:</span>
                                        <span className="font-bold text-neutral-800">₹{selectedRequest.returnPickupFee || 20}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block">Fee Deduction Status:</span>
                                        <span className={`font-bold ${selectedRequest.riderPayoutProcessed ? 'text-red-600' : 'text-neutral-500'}`}>
                                            {selectedRequest.riderPayoutProcessed ? '⚠️ Deducted from your Wallet (Paid to Rider)' : '⏳ Pending Admin Settlement'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Destination Info */}
                            {selectedRequest.refundMethod && (
                                <div className="bg-blue-50 border border-blue-200/60 p-4 rounded-xl shadow-sm text-left space-y-2">
                                    <span className="text-xs text-blue-700 font-bold uppercase block mb-1 tracking-wider">Refund Method</span>
                                    <div className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                                        {selectedRequest.refundMethod === 'Wallet' && '⚡ Instant Refund to Wallet'}
                                        {selectedRequest.refundMethod === 'UPI' && '📱 UPI Refund'}
                                        {(selectedRequest.refundMethod === 'Bank Account' || selectedRequest.refundMethod === 'Bank') && '🏦 Bank Account Transfer'}
                                        {!['Wallet', 'UPI', 'Bank Account', 'Bank'].includes(selectedRequest.refundMethod) && '💳 Original Payment Source'}
                                    </div>
                                    {selectedRequest.refundMethod === 'UPI' && selectedRequest.bankDetails?.upiId && (
                                        <div className="text-xs font-mono bg-white p-2 rounded border border-blue-100 text-neutral-700">
                                            <span className="font-bold text-neutral-500">UPI ID:</span> {selectedRequest.bankDetails.upiId}
                                        </div>
                                    )}
                                    {(selectedRequest.refundMethod === 'Bank Account' || selectedRequest.refundMethod === 'Bank') && selectedRequest.bankDetails?.accountNumber && (
                                        <div className="text-xs font-mono bg-white p-2.5 rounded border border-blue-100 text-neutral-700 space-y-1">
                                            <div><span className="font-bold text-neutral-500">Acc Holder:</span> {selectedRequest.bankDetails.accountName}</div>
                                            <div><span className="font-bold text-neutral-500">Acc No:</span> {selectedRequest.bankDetails.accountNumber}</div>
                                            <div><span className="font-bold text-neutral-500">IFSC:</span> {selectedRequest.bankDetails.ifscCode}</div>
                                            <div><span className="font-bold text-neutral-500">Bank:</span> {selectedRequest.bankDetails.bankName}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* State / Status info */}
                            <div className="flex items-center gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                                <span className="text-sm font-semibold text-neutral-500">Current Request Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    selectedRequest.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                    selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                                    selectedRequest.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                    'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-neutral-200 px-6 py-4 flex flex-wrap justify-between items-center gap-3 bg-neutral-50">
                            <div>
                                <button
                                    onClick={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                            
                            {selectedRequest.status === 'Pending' && (
                                <div className="flex gap-2">
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStatusUpdate(selectedRequest.id, 'Rejected')}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Reject Return
                                    </button>
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStatusUpdate(selectedRequest.id, 'Approved')}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Approve Return
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="px-4 sm:px-6 py-4 text-center bg-white border-t border-neutral-200">
                <p className="text-xs sm:text-sm text-neutral-500 font-medium">
                    Copyright © 2026. Developed By{' '}
                    <span className="font-semibold text-green-600">vrushahi e-Commerce</span>
                </p>
            </footer>
        </div>
    );
}

