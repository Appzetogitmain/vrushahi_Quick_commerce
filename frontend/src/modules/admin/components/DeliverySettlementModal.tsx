import React, { useState, useEffect } from 'react';
import { processDeliverySettlement } from '../../../services/api/admin/adminWalletService';
import { useToast } from '../../../context/ToastContext';

interface DeliverySettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deliveryBoys: Array<{ _id: string; name: string; mobile: string; balance: number }>;
}

const DeliverySettlementModal: React.FC<DeliverySettlementModalProps> = ({ isOpen, onClose, onSuccess, deliveryBoys }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deliveryBoyId: '',
    amount: '',
    paymentMethod: 'UPI',
    referenceId: '',
    notes: ''
  });

  const selectedDeliveryBoy = deliveryBoys.find(d => d._id === formData.deliveryBoyId);
  const maxAvailable = selectedDeliveryBoy ? selectedDeliveryBoy.balance : 0;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      setFormData({
        deliveryBoyId: '',
        amount: '',
        paymentMethod: 'UPI',
        referenceId: '',
        notes: ''
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(formData.amount);
    if (!formData.deliveryBoyId || !amountNum || amountNum < 1) {
      showToast('Please select a delivery boy and enter a valid amount (min ₹1)', 'error');
      return;
    }

    if (amountNum > maxAvailable) {
      showToast(`Amount exceeds available balance (₹${maxAvailable.toFixed(2)})`, 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await processDeliverySettlement({
        deliveryBoyId: formData.deliveryBoyId,
        amount: amountNum,
        paymentMethod: formData.paymentMethod,
        referenceId: formData.referenceId,
        notes: formData.notes
      });

      if (response.success) {
        showToast('Payout processed successfully', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(response.message || 'Failed to process payout', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error processing payout', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Process Delivery Payout</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Delivery Boy Selection */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Select Delivery Partner *</label>
            <select
              required
              value={formData.deliveryBoyId}
              onChange={(e) => setFormData({ ...formData, deliveryBoyId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
            >
              <option value="">Choose a partner</option>
              {deliveryBoys.map(d => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.mobile}) - ₹{d.balance.toLocaleString()}
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
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-500 mb-1.5 text-left">Current Balance</label>
              <div className="px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-600 font-medium text-center">
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
                  className={`py-1.5 text-sm rounded-lg border-2 transition-all ${
                    formData.paymentMethod === method
                      ? 'border-teal-600 bg-teal-600 text-white'
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
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
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
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none resize-none"
            ></textarea>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : 'Confirm Payout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliverySettlementModal;
