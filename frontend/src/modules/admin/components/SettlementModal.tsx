import React, { useState, useEffect } from 'react';
import { processSellerSettlement } from '../../../services/api/admin/adminWalletService';
import { useToast } from '../../../context/ToastContext';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sellers: Array<{ _id: string; sellerName: string; storeName: string; balance: number }>;
  availableGlobal: number;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose, onSuccess, sellers, availableGlobal }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sellerId: '',
    amount: '',
    paymentMethod: 'UPI',
    referenceId: '',
    notes: ''
  });

  const selectedSeller = sellers.find(s => s._id === formData.sellerId);
  const maxAvailable = selectedSeller ? Math.min(selectedSeller.balance, availableGlobal) : 0;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        sellerId: '',
        amount: '',
        paymentMethod: 'UPI',
        referenceId: '',
        notes: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(formData.amount);
    if (!formData.sellerId || !amountNum || amountNum < 1) {
      showToast('Please select a seller and enter a valid amount (min ₹1)', 'error');
      return;
    }

    if (amountNum > maxAvailable) {
      showToast(`Amount exceeds available limit (₹${maxAvailable.toFixed(2)})`, 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await processSellerSettlement({
        sellerId: formData.sellerId,
        amount: amountNum,
        paymentMethod: formData.paymentMethod,
        referenceId: formData.referenceId,
        notes: formData.notes
      });

      if (response.success) {
        showToast('Settlement processed successfully', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(response.message || 'Failed to process settlement', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error processing settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-neutral-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Settle Seller Payment</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Seller Selection */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Select Seller *</label>
            <select
              required
              value={formData.sellerId}
              onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none"
            >
              <option value="">Choose a seller</option>
              {sellers.map(s => (
                <option key={s._id} value={s._id}>
                  {s.storeName} ({s.sellerName}) - ₹{s.balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Amount to Pay (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-500 mb-1.5 text-left">Max Available</label>
              <div className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 font-medium">
                ₹{maxAvailable.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Payment Method *</label>
            <div className="grid grid-cols-3 gap-3">
              {['UPI', 'Bank Transfer', 'Cash'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method })}
                  className={`py-2 text-sm rounded-xl border-2 transition-all ${
                    formData.paymentMethod === method
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-100 bg-neutral-50 text-neutral-600 hover:border-neutral-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Reference ID */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Reference ID / Transaction ID</label>
            <input
              type="text"
              value={formData.referenceId}
              onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
              placeholder="UTR number, Txn ID, etc."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Any additional remarks..."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none resize-none"
            ></textarea>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-bold text-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neutral-200"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlementModal;
