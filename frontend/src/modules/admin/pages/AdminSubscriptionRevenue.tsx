import React, { useState, useEffect } from 'react';
import { getSubscriptionRevenue, getSubscriptionStats } from '../../../services/api/subscription/adminSubscriptionService';
import { useToast } from '../../../context/ToastContext';
import DataTable from '../components/DataTable';

export default function AdminSubscriptionRevenue() {
  const { showToast } = useToast();
  
  const [stats, setStats] = useState<any>(null);
  const [revenueList, setRevenueList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1, limit: 10 });

  useEffect(() => {
    fetchData();
  }, [pagination.page, search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, revenueRes] = await Promise.all([
        getSubscriptionStats(),
        getSubscriptionRevenue(pagination.page, pagination.limit, search, statusFilter)
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (revenueRes.success) {
        setRevenueList(revenueRes.data || []);
        setPagination(revenueRes.pagination || { total: 0, pages: 0, page: 1, limit: 10 });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch subscription revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Order ID', accessor: 'razorpayOrderId' },
    { header: 'Seller', accessor: (row: any) => row.seller?.storeName || row.seller?.sellerName || 'Unknown' },
    { header: 'Plan', accessor: 'planName' },
    { header: 'Amount', accessor: (row: any) => `₹${row.amount}` },
    { header: 'Date', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
    {
      header: 'Status',
      accessor: (row: any) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          row.status === 'Active' ? 'bg-green-100 text-green-700' : 
          row.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 
          'bg-neutral-100 text-neutral-700'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Subscription Revenue</h1>
          <p className="text-neutral-500 text-sm mt-1">Overview of subscription earnings and history</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <h3 className="text-sm font-medium text-neutral-500">Total Subscription Revenue</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-2">₹{stats.totalRevenue}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <h3 className="text-sm font-medium text-neutral-500">Total Subscribers</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-2">{stats.totalSubscribers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <h3 className="text-sm font-medium text-neutral-500">Active Subscriptions</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.activeSubscriptions}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <h3 className="text-sm font-medium text-neutral-500">Expired/Cancelled</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.cancelledSubscriptions}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={revenueList}
          isLoading={loading}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.pages,
            onPageChange: (page: number) => setPagination(prev => ({ ...prev, page }))
          }}
        />
      </div>
    </div>
  );
}
