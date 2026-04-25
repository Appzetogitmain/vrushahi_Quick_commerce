import React, { useState, useEffect } from 'react';
import { processAgentCollection } from '../../../services/api/admin/adminCashService';
import { useToast } from '../../../context/ToastContext';

interface AgentCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: { _id: string; name: string; pending: number } | null;
}

const AgentCollectModal: React.FC<AgentCollectModalProps> = ({ isOpen, onClose, onSuccess, agent }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: 'Cash',
    referenceId: '',
    remark: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        paymentMode: 'Cash',
        referenceId: '',
        remark: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) return;

    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum < 1) {
      showToast('Please enter a valid amount (min ₹1)', 'error');
      return;
    }

    if (amountNum > agent.pending) {
      showToast(`Amount exceeds pending cash (₹${agent.pending.toLocaleString()})`, 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await processAgentCollection({
        deliveryBoyId: agent._id,
        amount: amountNum,
        paymentMode: formData.paymentMode,
        referenceId: formData.referenceId,
        remark: formData.remark
      });

      if (response.success) {
        showToast('Cash collected successfully', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(response.message || 'Failed to collect cash', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error collecting cash', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-neutral-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Collect Cash from Rider</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-3">
             <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <p className="text-xs text-amber-800 leading-normal">
               <strong>Important:</strong> Ensure you have physically received the cash from <strong>{agent.name}</strong> before confirming this submission.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-500 mb-1.5 text-left">Rider Name</label>
              <div className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 font-medium">
                {agent.name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-500 mb-1.5 text-left">Pending Cash</label>
              <div className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-red-600 font-bold">
                ₹{agent.pending.toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Amount Received (₹) *</label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter collected amount"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-3">
              {['Cash', 'UPI', 'Bank Transfer'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMode: mode })}
                  className={`py-2 text-sm rounded-xl border-2 transition-all ${
                    formData.paymentMode === mode
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-100 bg-neutral-50 text-neutral-600 hover:border-neutral-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Reference ID (Optional)</label>
            <input
              type="text"
              value={formData.referenceId}
              onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
              placeholder="Txn ID, UTR, etc."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5 text-left">Remarks</label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              rows={2}
              placeholder="Any additional notes..."
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
              ) : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentCollectModal;
