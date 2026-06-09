import { useState, useEffect } from 'react';
import {
    getDeliveryBoys,
    updateDeliveryBoyStatus,
    updateDeliveryBoyAvailability,
    deleteDeliveryBoy,
    type DeliveryBoy,
} from '../../../services/api/admin/adminDeliveryService';
import { useAuth } from '../../../context/AuthContext';

export default function AdminManageDeliveryBoy() {
    const { isAuthenticated, token } = useAuth();
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
    const [loading, setLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [availabilityFilter, setAvailabilityFilter] = useState('All');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [totalPages, setTotalPages] = useState(1);
    const [totalDeliveryBoys, setTotalDeliveryBoys] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<DeliveryBoy | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    // Debounce search term and fetch delivery boys
    useEffect(() => {
        if (!isAuthenticated || !token) {
            setLoading(false);
            return;
        }

        const fetchDeliveryBoys = async () => {
            try {
                setLoading(true);
                setError(null);

                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    search: searchTerm || undefined,
                    sortBy: sortColumn || undefined,
                    sortOrder: sortDirection,
                };

                if (statusFilter !== 'All') {
                    params.status = statusFilter;
                }

                if (availabilityFilter !== 'All') {
                    params.available = availabilityFilter;
                }

                const response = await getDeliveryBoys(params);

                if (response.success) {
                    setDeliveryBoys(response.data);
                    // Update pagination info from backend
                    if (response.pagination) {
                        setTotalPages(response.pagination.pages);
                        setTotalDeliveryBoys(response.pagination.total);
                    }
                } else {
                    setError('Failed to load delivery boys');
                }
            } catch (err: any) {
                console.error('Error fetching delivery boys:', err);
                setError(err.response?.data?.message || 'Failed to load delivery boys. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        // Debounce search term
        const timer = setTimeout(() => {
            fetchDeliveryBoys();
        }, searchTerm ? 500 : 0); // Immediate fetch if search is empty, debounce if typing

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, token, currentPage, rowsPerPage, searchTerm, statusFilter, availabilityFilter, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        // Map frontend column names to backend field names
        const columnMap: Record<string, string> = {
            'id': '_id',
            '_id': '_id',
            'name': 'name',
            'mobile': 'mobile',
            'city': 'city',
            'balance': 'balance',
            'cashCollected': 'cashCollected',
            'status': 'status',
            'available': 'available',
        };
        const backendColumn = columnMap[column] || column;
        
        if (sortColumn === backendColumn) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(backendColumn);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page when sorting changes
    };

    const handleStatusChange = async (deliveryBoyId: string, newStatus: 'Active' | 'Inactive' | 'Rejected', reason?: string) => {
        try {
            setProcessing(deliveryBoyId);
            const response = await updateDeliveryBoyStatus(deliveryBoyId, newStatus, reason);

            if (response.success) {
                // Update local state
                setDeliveryBoys(deliveryBoys.map(deliveryBoy =>
                    deliveryBoy._id === deliveryBoyId ? { ...deliveryBoy, status: newStatus } : deliveryBoy
                ));
                setSuccessMessage(`Delivery boy status updated to ${newStatus} successfully!`);
                setError('');
                // Refresh list to get updated data
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    search: searchTerm,
                    sortBy: sortColumn || undefined,
                    sortOrder: sortDirection,
                };
                if (statusFilter !== 'All') params.status = statusFilter;
                if (availabilityFilter !== 'All') params.available = availabilityFilter;
                const refreshResponse = await getDeliveryBoys(params);
                if (refreshResponse.success && refreshResponse.data) {
                    setDeliveryBoys(refreshResponse.data);
                    if (refreshResponse.pagination) {
                        setTotalPages(refreshResponse.pagination.pages);
                        setTotalDeliveryBoys(refreshResponse.pagination.total);
                    }
                }
            } else {
                setError('Failed to update delivery boy status: ' + (response.message || 'Unknown error'));
                setSuccessMessage('');
            }
        } catch (err: any) {
            console.error('Error updating delivery boy status:', err);
            setError('Failed to update delivery boy status: ' + (err.response?.data?.message || 'Please try again.'));
            setSuccessMessage('');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = (deliveryBoyId: string) => {
        setRejectingId(deliveryBoyId);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectingId || !rejectionReason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        await handleStatusChange(rejectingId, 'Rejected', rejectionReason);
        setShowRejectModal(false);
        setRejectingId(null);
        setRejectionReason('');
    };

    const handleAvailabilityChange = async (deliveryBoyId: string, newAvailability: 'Available' | 'Not Available') => {
        try {
            setProcessing(deliveryBoyId);
            const response = await updateDeliveryBoyAvailability(deliveryBoyId, newAvailability);

            if (response.success) {
                // Update local state
                setDeliveryBoys(deliveryBoys.map(deliveryBoy =>
                    deliveryBoy._id === deliveryBoyId ? { ...deliveryBoy, available: newAvailability } : deliveryBoy
                ));
                setSuccessMessage(`Delivery boy availability updated to ${newAvailability} successfully!`);
                setError('');
                // Refresh list to get updated data
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    search: searchTerm,
                    sortBy: sortColumn || undefined,
                    sortOrder: sortDirection,
                };
                if (statusFilter !== 'All') params.status = statusFilter;
                if (availabilityFilter !== 'All') params.available = availabilityFilter;
                const refreshResponse = await getDeliveryBoys(params);
                if (refreshResponse.success && refreshResponse.data) {
                    setDeliveryBoys(refreshResponse.data);
                    if (refreshResponse.pagination) {
                        setTotalPages(refreshResponse.pagination.pages);
                        setTotalDeliveryBoys(refreshResponse.pagination.total);
                    }
                }
            } else {
                setError('Failed to update delivery boy availability: ' + (response.message || 'Unknown error'));
                setSuccessMessage('');
            }
        } catch (err: any) {
            console.error('Error updating delivery boy availability:', err);
            setError('Failed to update delivery boy availability: ' + (err.response?.data?.message || 'Please try again.'));
            setSuccessMessage('');
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (deliveryBoyId: string) => {
        if (!window.confirm('Are you sure you want to delete this delivery boy? This action cannot be undone.')) {
            return;
        }

        try {
            setProcessing(deliveryBoyId);
            const response = await deleteDeliveryBoy(deliveryBoyId);

            if (response.success) {
                setSuccessMessage('Delivery boy deleted successfully!');
                setError('');
                // Refresh list
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    search: searchTerm,
                    sortBy: sortColumn || undefined,
                    sortOrder: sortDirection,
                };
                if (statusFilter !== 'All') params.status = statusFilter;
                if (availabilityFilter !== 'All') params.available = availabilityFilter;
                const refreshResponse = await getDeliveryBoys(params);
                if (refreshResponse.success && refreshResponse.data) {
                    setDeliveryBoys(refreshResponse.data);
                    if (refreshResponse.pagination) {
                        setTotalPages(refreshResponse.pagination.pages);
                        setTotalDeliveryBoys(refreshResponse.pagination.total);
                    }
                }
            } else {
                setError('Failed to delete delivery boy: ' + (response.message || 'Unknown error'));
                setSuccessMessage('');
            }
        } catch (err: any) {
            console.error('Error deleting delivery boy:', err);
            setError('Failed to delete delivery boy: ' + (err.response?.data?.message || 'Please try again.'));
            setSuccessMessage('');
        } finally {
            setProcessing(null);
        }
    };

    const handleExtendDeadline = async (deliveryBoyId: string) => {
        if (!window.confirm("Are you sure you want to extend this rider's Police Verification deadline by 15 days?")) {
            return;
        }

        try {
            setProcessing(deliveryBoyId);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/admin/delivery/${deliveryBoyId}/extend-pv-deadline`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ additionalDays: 15 })
            });
            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message);
                setError('');
                // Refresh list
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    search: searchTerm,
                    sortBy: sortColumn || undefined,
                    sortOrder: sortDirection,
                };
                if (statusFilter !== 'All') params.status = statusFilter;
                if (availabilityFilter !== 'All') params.available = availabilityFilter;
                const refreshResponse = await getDeliveryBoys(params);
                if (refreshResponse.success && refreshResponse.data) {
                    setDeliveryBoys(refreshResponse.data);
                }
            } else {
                setError('Failed to extend deadline: ' + (data.message || 'Unknown error'));
                setSuccessMessage('');
            }
        } catch (err: any) {
            console.error('Error extending deadline:', err);
            setError('Failed to extend deadline. Please try again.');
            setSuccessMessage('');
        } finally {
            setProcessing(null);
        }
    };

    const handleExport = () => {
        const headers = ['Id', 'Name', 'Mobile', 'Address', 'City', 'Commission', 'Balance', 'Cash Collected', 'Status', 'Available'];
        const csvContent = [
            headers.join(','),
            ...deliveryBoys.map(deliveryBoy => [
                deliveryBoy._id.slice(-6),
                `"${deliveryBoy.name}"`,
                deliveryBoy.mobile,
                `"${deliveryBoy.address}"`,
                `"${deliveryBoy.city}"`,
                'Distance Based',
                deliveryBoy.balance,
                deliveryBoy.cashCollected,
                deliveryBoy.status,
                deliveryBoy.available
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `delivery_boys_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortIcon = ({ column }: { column: string }) => {
        // Map frontend column names to backend field names for comparison
        const columnMap: Record<string, string> = {
            'id': '_id',
            '_id': '_id',
            'name': 'name',
            'mobile': 'mobile',
            'city': 'city',
            'balance': 'balance',
            'cashCollected': 'cashCollected',
            'status': 'status',
            'available': 'available',
        };
        const backendColumn = columnMap[column] || column;
        
        return (
            <span className="text-neutral-400 text-xs ml-1">
                {sortColumn === backendColumn ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
            </span>
        );
    };

    // Use backend data directly (already paginated, filtered, and sorted)
    const displayedDeliveryBoys = deliveryBoys;
    const startIndex = (currentPage - 1) * rowsPerPage;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Page Content */}
            <div className="flex-1 p-6">
                {/* Main Panel */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
                    {/* Header */}
                    <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg">
                        <h2 className="text-lg font-semibold">View Delivery Boy List</h2>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center justify-between">
                            <p className="text-sm">{error}</p>
                            <button
                                onClick={() => setError('')}
                                className="text-red-700 hover:text-red-900 ml-4 text-lg font-bold"
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 flex items-center justify-between">
                            <p className="text-sm">{successMessage}</p>
                            <button
                                onClick={() => setSuccessMessage('')}
                                className="text-green-700 hover:text-green-900 ml-4 text-lg font-bold"
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="p-4 border-b border-neutral-200 flex flex-col gap-4">
                        {/* Filters Row */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-neutral-700 whitespace-nowrap">Status:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="PV_Pending">Police Verification Pending</option>
                                    <option value="Limit_Reached">Cash Limit Reached</option>
                                </select>
                            </div>

                            {/* Availability Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-neutral-700 whitespace-nowrap">Availability:</label>
                                <select
                                    value={availabilityFilter}
                                    onChange={(e) => {
                                        setAvailabilityFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                >
                                    <option value="All">All Availability</option>
                                    <option value="Available">Available</option>
                                    <option value="Not Available">Not Available</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-neutral-700 whitespace-nowrap">Search:</label>
                                <input
                                    type="text"
                                    className="px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none min-w-[200px]"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Search by name, mobile, address..."
                                />
                            </div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">Show</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm text-neutral-600">entries</span>
                            </div>

                            <div className="relative">
                              <button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0"><path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Export
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              {isExportOpen && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-2xl z-50 border border-neutral-200 overflow-hidden">
                                  <button
                                    onClick={() => { setIsExportOpen(false); handleExport(); }}
                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700"
                                  >
                                    CSV
                                  </button>
                                  <button
                                    onClick={() => { setIsExportOpen(false); handleExport(); }}
                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 border-t border-neutral-100"
                                  >
                                    Excel
                                  </button>
                                  <button
                                    onClick={() => { setIsExportOpen(false); window.print(); }}
                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 border-t border-neutral-100"
                                  >
                                    PDF / Print
                                  </button>
                                </div>
                              )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('id')}
                                    >
                                        <div className="flex items-center">
                                            Id <SortIcon column="id" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center">
                                            Name <SortIcon column="name" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('mobile')}
                                    >
                                        <div className="flex items-center">
                                            Mobile <SortIcon column="mobile" />
                                        </div>
                                    </th>
                                    <th className="p-4">
                                        Commission
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('balance')}
                                    >
                                        <div className="flex items-center">
                                            Balance <SortIcon column="balance" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('cashCollected')}
                                    >
                                        <div className="flex items-center">
                                            Cash Collected <SortIcon column="cashCollected" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center">
                                            Status <SortIcon column="status" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('available')}
                                    >
                                        <div className="flex items-center">
                                            Available <SortIcon column="available" />
                                        </div>
                                    </th>
                                    <th className="p-4">
                                        Police Verification
                                    </th>
                                    <th className="p-4">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mr-2"></div>
                                                Loading delivery boys...
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-red-600">
                                            {error}
                                        </td>
                                    </tr>
                                ) : displayedDeliveryBoys.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-neutral-400">
                                            No delivery boys found.
                                        </td>
                                    </tr>
                                ) : (
                                    displayedDeliveryBoys.map((deliveryBoy) => (
                                        <tr key={deliveryBoy._id} className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200">
                                            <td className="p-4 align-middle">{deliveryBoy._id.slice(-6)}</td>
                                            <td className="p-4 align-middle">{deliveryBoy.name}</td>
                                            <td className="p-4 align-middle">{deliveryBoy.mobile}</td>
                                            <td className="p-4 align-middle">
                                                <div className="text-xs">
                                                    <div className="font-medium text-green-600">Distance Based</div>
                                                    <div className="text-neutral-500">System Managed</div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">₹{deliveryBoy.balance.toFixed(2)}</td>
                                            <td className="p-4 align-middle">₹{deliveryBoy.cashCollected.toFixed(2)}</td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${deliveryBoy.status === 'Active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {deliveryBoy.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${deliveryBoy.available === 'Available'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {deliveryBoy.available}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {deliveryBoy.policeVerificationForm ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        {(() => {
                                                            const deadline = deliveryBoy.policeVerificationDeadline ? new Date(deliveryBoy.policeVerificationDeadline) : null;
                                                            if (!deadline) return <span className="text-xs font-medium text-neutral-500">Not Set</span>;
                                                            const now = new Date();
                                                            const diffTime = deadline.getTime() - now.getTime();
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            const isExpired = diffDays < 0;
                                                            
                                                            return (
                                                                <>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                        isExpired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                        {isExpired ? 'Expired' : 'Pending'}
                                                                    </span>
                                                                    <span className={`text-[10px] mt-1 ${isExpired ? 'text-red-500 font-medium' : 'text-neutral-500'}`}>
                                                                        {isExpired ? `Expired by ${Math.abs(diffDays)} day(s)` : `${diffDays} day(s) left`}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2">

                                                    <button
                                                        onClick={() => handleAvailabilityChange(deliveryBoy._id, deliveryBoy.available === 'Available' ? 'Not Available' : 'Available')}
                                                        disabled={processing === deliveryBoy._id}
                                                        className={`p-1.5 rounded transition-colors ${deliveryBoy.available === 'Available'
                                                            ? 'text-yellow-600 hover:bg-yellow-50'
                                                            : 'text-green-600 hover:bg-green-50'
                                                            }`}
                                                        title={deliveryBoy.available === 'Available' ? 'Mark as Not Available' : 'Mark as Available'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <path d="M9 12l2 2 4-4"></path>
                                                        </svg>
                                                    </button>

                                                    {(!deliveryBoy.policeVerificationForm && (!deliveryBoy.policeVerificationDeadline || new Date(deliveryBoy.policeVerificationDeadline) < new Date())) && (
                                                        <button
                                                            onClick={() => handleExtendDeadline(deliveryBoy._id)}
                                                            disabled={processing === deliveryBoy._id}
                                                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                            title="Extend PV Deadline (+15 Days)"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDelete(deliveryBoy._id)}
                                                        disabled={processing === deliveryBoy._id}
                                                        className="p-1.5 text-neutral-400 hover:bg-neutral-50 rounded transition-colors"
                                                        title="Delete (Final)"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDeliveryBoy(deliveryBoy);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View Details"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                            <circle cx="12" cy="12" r="3"></circle>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                        <div className="text-xs sm:text-sm text-neutral-700">
                            Showing {displayedDeliveryBoys.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + displayedDeliveryBoys.length, totalDeliveryBoys)} of {totalDeliveryBoys} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 border border-teal-600 rounded ${currentPage === 1
                                    ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                    : 'text-teal-600 hover:bg-teal-50'
                                    }`}
                                aria-label="Previous page"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M15 18L9 12L15 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-3 py-1.5 border border-teal-600 rounded font-medium text-sm ${currentPage === pageNum
                                            ? 'bg-teal-600 text-white'
                                            : 'text-teal-600 hover:bg-teal-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                <span className="px-2 text-neutral-400">...</span>
                            )}
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className={`p-2 border border-teal-600 rounded ${currentPage === totalPages
                                    ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                    : 'text-teal-600 hover:bg-teal-50'
                                    }`}
                                aria-label="Next page"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M9 18L15 12L9 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-4 text-sm text-neutral-600 border-t border-neutral-200 bg-white">
                Copyright © 2026. Developed By{' '}
                <a href="#" className="text-blue-600 hover:underline">Vrushahi Market your own & reliable store</a>
            </footer>

            {/* Detail Modal */}
            {showDetailModal && selectedDeliveryBoy && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Delivery Boy Details</h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-teal-700 border-b pb-1">Basic Information</h4>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Full Name</p>
                                        <p className="font-medium">{selectedDeliveryBoy.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Mobile Number</p>
                                        <p className="font-medium">{selectedDeliveryBoy.mobile}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Email Address</p>
                                        <p className="font-medium">{selectedDeliveryBoy.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Date of Birth</p>
                                        <p className="font-medium">
                                            {selectedDeliveryBoy.dateOfBirth ? new Date(selectedDeliveryBoy.dateOfBirth).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Police Verification</p>
                                        {selectedDeliveryBoy.policeVerificationForm ? (
                                            <a
                                                href={selectedDeliveryBoy.policeVerificationForm}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-teal-600 font-bold hover:underline flex items-center mt-1"
                                            >
                                                View Document
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        ) : (
                                            <p className={`text-sm font-bold mt-1 ${
                                                selectedDeliveryBoy.policeVerificationDeadline && new Date(selectedDeliveryBoy.policeVerificationDeadline) < new Date()
                                                    ? 'text-red-600'
                                                    : 'text-yellow-600'
                                            }`}>
                                                {selectedDeliveryBoy.policeVerificationDeadline && new Date(selectedDeliveryBoy.policeVerificationDeadline) < new Date()
                                                    ? 'Expired'
                                                    : `Pending (Deadline: ${selectedDeliveryBoy.policeVerificationDeadline ? new Date(selectedDeliveryBoy.policeVerificationDeadline).toLocaleDateString() : 'N/A'})`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Address & Status */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-teal-700 border-b pb-1">Address & Status</h4>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">City</p>
                                        <p className="font-medium">{selectedDeliveryBoy.city}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Address</p>
                                        <p className="font-medium text-sm">{selectedDeliveryBoy.address}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Status / Availability</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${selectedDeliveryBoy.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {selectedDeliveryBoy.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${selectedDeliveryBoy.available === 'Available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {selectedDeliveryBoy.available}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Vehicle Details */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-teal-700 border-b pb-1">Vehicle Details</h4>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Vehicle Type</p>
                                        <p className="font-medium">{selectedDeliveryBoy.vehicleType || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Vehicle Number</p>
                                        <p className="font-medium">{selectedDeliveryBoy.vehicleNumber || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-teal-700 border-b pb-1">Bank Account</h4>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Account holder name</p>
                                        <p className="font-medium">{selectedDeliveryBoy.accountName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Bank Name</p>
                                        <p className="font-medium">{selectedDeliveryBoy.bankName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">Account Number</p>
                                        <p className="font-medium">{selectedDeliveryBoy.bankAccountNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase">IFSC Code</p>
                                        <p className="font-medium">{selectedDeliveryBoy.ifscCode || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-teal-700 border-b pb-1">Documents</h4>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase mb-1">Driving License</p>
                                        {selectedDeliveryBoy.drivingLicense ? (
                                            <a 
                                                href={selectedDeliveryBoy.drivingLicense} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                                View Document
                                            </a>
                                        ) : <p className="text-sm text-neutral-400 italic">Not Uploaded</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase mb-1">National ID Card</p>
                                        {selectedDeliveryBoy.nationalIdentityCard ? (
                                            <a 
                                                href={selectedDeliveryBoy.nationalIdentityCard} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                                View Document
                                            </a>
                                        ) : <p className="text-sm text-neutral-400 italic">Not Uploaded</p>}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t p-4 flex justify-end gap-3">
                            {selectedDeliveryBoy.status !== 'Active' && (
                                <button
                                    onClick={() => {
                                        handleStatusChange(selectedDeliveryBoy._id, 'Active');
                                        setShowDetailModal(false);
                                    }}
                                    disabled={processing === selectedDeliveryBoy._id}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    Approve
                                </button>
                            )}
                            {selectedDeliveryBoy.status === 'Active' && (
                                <button
                                    onClick={() => {
                                        handleStatusChange(selectedDeliveryBoy._id, 'Inactive');
                                        setShowDetailModal(false);
                                    }}
                                    disabled={processing === selectedDeliveryBoy._id}
                                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                                >
                                    Deactivate
                                </button>
                            )}
                            {selectedDeliveryBoy.status !== 'Rejected' && (
                                <button
                                    onClick={() => {
                                        handleReject(selectedDeliveryBoy._id);
                                        setShowDetailModal(false);
                                    }}
                                    disabled={processing === selectedDeliveryBoy._id}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Reject
                                </button>
                            )}
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-red-600 p-6 text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Reject Delivery Partner
                            </h3>
                            <p className="text-red-100 text-sm mt-1">Please provide a reason why you are rejecting this application.</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-neutral-700 mb-2 uppercase tracking-wider">Reason for Rejection</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g. Invalid Driving License, Document image not clear, etc."
                                className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:outline-none focus:border-red-500 transition-all min-h-[120px] resize-none text-sm"
                                autoFocus
                            />
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={processing !== null}
                                className="flex-2 px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing !== null ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

