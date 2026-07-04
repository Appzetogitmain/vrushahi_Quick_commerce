import React, { useState, useEffect } from 'react';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan
} from '../../../services/api/subscription/adminSubscriptionService';
import { useToast } from '../../../context/ToastContext';
import DataTable from '../components/DataTable';

export default function AdminSubscriptionPlans() {
  const { showToast } = useToast();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1, limit: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    description: '',
    duration: 30,
    actualPrice: '' as number | '',
    discountedPrice: '' as number | '',
    isActive: true
  });

  useEffect(() => {
    fetchPlans();
  }, [pagination.page, search]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getSubscriptionPlans(pagination.page, pagination.limit, search);
      if (res.success) {
        setPlans(res.data || []);
        setPagination({ total: res.data?.length || 0, pages: 1, page: 1, limit: 10 });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan: any = null) => {
    if (plan) {
      setFormData({
        _id: plan._id,
        name: plan.name,
        description: plan.description || '',
        duration: plan.duration,
        actualPrice: plan.actualPrice,
        discountedPrice: plan.discountedPrice,
        isActive: plan.isActive
      });
    } else {
      setFormData({
        _id: '',
        name: '',
        description: '',
        duration: 30,
        actualPrice: '',
        discountedPrice: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const actualPriceValue = formData.actualPrice === '' ? 0 : Number(formData.actualPrice);
      const discountedPriceValue = formData.discountedPrice === '' ? actualPriceValue : Number(formData.discountedPrice);
      
      const dataToSave = {
        ...formData,
        actualPrice: actualPriceValue,
        discountedPrice: discountedPriceValue
      };

      if (formData._id) {
        await updateSubscriptionPlan(formData._id, dataToSave);
        showToast('Plan updated successfully', 'success');
      } else {
        await createSubscriptionPlan(dataToSave);
        showToast('Plan created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error saving plan', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await deleteSubscriptionPlan(id);
        showToast('Plan deleted successfully', 'success');
        fetchPlans();
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Error deleting plan', 'error');
      }
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Duration (Days)', accessor: 'duration' },
    { header: 'Actual Price', accessor: (row: any) => `₹${row.actualPrice}` },
    { header: 'Discounted Price', accessor: (row: any) => `₹${row.discountedPrice}` },
    { header: 'Savings', accessor: (row: any) => `₹${row.savings}` },
    {
      header: 'Status',
      accessor: (row: any) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  const actions = (row: any) => (
    <div className="flex gap-2">
      <button onClick={() => handleOpenModal(row)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
      <button onClick={() => handleDelete(row._id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Subscription Plans</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage seller subscription plans and pricing</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <DataTable
          columns={columns}
          data={plans}
          isLoading={loading}
          actions={actions}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.pages,
            onPageChange: (page: number) => setPagination(prev => ({ ...prev, page }))
          }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-neutral-800">{formData._id ? 'Edit Plan' : 'Add New Plan'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-neutral-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Plan Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Duration (Days)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.duration.toString()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormData({ ...formData, duration: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Actual Price (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.actualPrice.toString()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormData({ ...formData, actualPrice: val === '' ? '' : Number(val) });
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Discounted Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave empty for no discount"
                    value={formData.discountedPrice.toString()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormData({ ...formData, discountedPrice: val === '' ? '' : Number(val) });
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 font-medium hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
