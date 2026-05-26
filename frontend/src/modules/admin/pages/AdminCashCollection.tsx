import { useState, useEffect, useCallback } from "react";
import {
  getCashCollectionStats,
  getAgentsCashSummary,
  getRecentCollections,
  getPendingOfflinePayouts,
  verifyOfflinePayout,
  toggleRiderBlock,
  sendPaymentReminder,
  type CashCollectionStats,
  type AgentCashSummary,
} from "../../../services/api/admin/adminCashService";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import CashSummaryCards from "../components/CashSummaryCards";
import AgentCollectModal from "../components/AgentCollectModal";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminCashCollection() {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'verifications'>('agents');
  
  // Stats & Data
  const [stats, setStats] = useState<CashCollectionStats>({
    totalCodCollected: 0,
    totalSubmitted: 0,
    pendingAmount: 0,
    agentsWithPending: 0,
  });
  const [agents, setAgents] = useState<AgentCashSummary[]>([]);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentCashSummary | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      setError(null);

      const [statsRes, agentsRes, recentRes, pendingRes] = await Promise.all([
        getCashCollectionStats(),
        getAgentsCashSummary(searchTerm),
        getRecentCollections({ limit: 10 }),
        getPendingOfflinePayouts()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (agentsRes.success) setAgents(agentsRes.data);
      if (recentRes.success) setRecentCollections(recentRes.data);
      if (pendingRes.success) setPendingVerifications(pendingRes.data);

    } catch (err: any) {
      console.error("Error fetching cash collection data:", err);
      setError(err.response?.data?.message || "Failed to load collection data");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCollectClick = (agent: AgentCashSummary) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleCollectionSuccess = () => {
    fetchData();
  };

  const handleVerifyPayout = async (status: "Completed" | "Rejected") => {
    if (!selectedPayout) return;
    if (status === "Rejected" && !rejectionReason) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await verifyOfflinePayout({
        payoutId: selectedPayout._id,
        status,
        rejectionReason
      });

      if (res.success) {
        showToast(`Payout ${status.toLowerCase()} successfully`, "success");
        setSelectedPayout(null);
        setRejectionReason("");
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Verification failed", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleBlock = async (agent: AgentCashSummary) => {
    const newStatus = agent.paymentStatus === 'Blocked' ? 'Clear' : 'Blocked';
    try {
      const res = await toggleRiderBlock(agent._id, newStatus);
      if (res.success) {
        showToast(`Rider ${newStatus === 'Blocked' ? 'blocked' : 'unblocked'} successfully`, "success");
        fetchData();
      }
    } catch (err: any) {
      showToast("Failed to update block status", "error");
    }
  };

  const handleSendReminder = async (agent: AgentCashSummary) => {
    try {
      const res = await sendPaymentReminder(agent._id);
      if (res.success) {
        showToast("Payment reminder sent to rider", "success");
      }
    } catch (err: any) {
      showToast("Failed to send reminder", "error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Cash Collection</h1>
          <p className="text-neutral-500 mt-1">Track and reconcile COD payments from delivery riders.</p>
        </div>
      </div>

      {/* Admin Guide Section */}
      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all hover:bg-amber-50">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1 pr-8">
            <h3 className="text-sm font-bold text-amber-900">Admin Reconcilation Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-amber-700/80 leading-relaxed">
              <p><span className="font-bold text-amber-800">Step 1:</span> Physically collect the cash amount from the delivery rider.</p>
              <p><span className="font-bold text-amber-800">Step 2:</span> Verify the amount against the "Pending Cash" shown in the table.</p>
              <p><span className="font-bold text-amber-800">Step 3:</span> Click "Collect" and enter the exact amount received.</p>
              <p><span className="font-bold text-amber-800">Step 4:</span> Once confirmed, the rider's balance will be reduced automatically.</p>
            </div>
            <p className="text-[10px] text-amber-600 pt-1 font-bold uppercase tracking-wider">
              ⚠️ WARNING: Only update after physical cash is in your hands.
            </p>
          </div>
        </div>
        <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <svg className="w-12 h-12 text-amber-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
      </div>

      {/* Summary Cards */}
      <CashSummaryCards stats={stats} loading={loading && agents.length === 0} />

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'agents' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          Delivery Agents
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 relative ${activeTab === 'verifications' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          Pending Verifications
          {pendingVerifications.length > 0 && (
            <span className="absolute top-3 right-2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse">
              {pendingVerifications.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {activeTab === 'agents' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-neutral-900 whitespace-nowrap">Delivery Agent COD Summary</h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto lg:justify-end">
                  <div className="relative group w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search rider name/mobile..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none w-full sm:w-64 transition-all shadow-sm group-hover:border-neutral-300"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50 text-neutral-500 text-[11px] uppercase tracking-wider font-bold border-b border-neutral-100">
                      <th className="px-6 py-4">Agent Name</th>
                      <th className="px-6 py-4 text-right">Collected</th>
                      <th className="px-6 py-4 text-right text-red-600">Pending</th>
                      <th className="px-6 py-4 text-center">Block Status</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {loading && agents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : agents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-neutral-400">
                          No active delivery agents found.
                        </td>
                      </tr>
                    ) : (
                      agents.map((agent) => (
                        <tr key={agent._id} className={`hover:bg-neutral-50/50 transition-colors ${agent.paymentStatus === 'Blocked' ? 'bg-red-50/10' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-neutral-900">{agent.name}</span>
                              <span className="text-xs text-neutral-500">{agent.mobile}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-neutral-600">
                            ₹{agent.cashCollected.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-red-600">₹{agent.pending.toLocaleString()}</span>
                              <span className="text-[10px] text-neutral-400">Limit: ₹{agent.cashLimit || 500}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleToggleBlock(agent)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                                agent.paymentStatus === 'Blocked' 
                                  ? 'bg-red-600 text-white shadow-lg shadow-red-100' 
                                  : 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                              }`}>
                              {agent.paymentStatus === 'Blocked' ? 'Blocked' : 'Clear'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tight ${
                              agent.status === 'Settled' ? 'text-green-700 bg-green-50' : 
                              agent.pending > 0 ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50'
                            }`}>
                              {agent.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {agent.pending > 0 && (
                                <button
                                  onClick={() => handleSendReminder(agent)}
                                  title="Send Payout Reminder"
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleCollectClick(agent)}
                                disabled={agent.pending <= 0}
                                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all disabled:opacity-30 active:scale-95">
                                Collect
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingVerifications.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-neutral-100 shadow-sm">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-neutral-900">All Caught Up!</h3>
                  <p className="text-neutral-500 mt-2">No pending payment verifications found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingVerifications.map((payout) => (
                    <motion.div 
                      layoutId={payout._id}
                      key={payout._id} 
                      className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-900 font-black">
                            {payout.deliveryBoy?.name?.charAt(0) || "R"}
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900">{payout.deliveryBoy?.name}</h4>
                            <p className="text-xs text-neutral-500">{payout.deliveryBoy?.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-neutral-900">₹{payout.amount}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">{new Date(payout.collectedAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="bg-neutral-50 rounded-2xl p-4 mb-6 border border-neutral-100">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-neutral-500">UTR / Ref ID</span>
                          <span className="text-xs font-black text-neutral-900">{payout.utrNumber}</span>
                        </div>
                        {payout.paymentScreenshot && (
                          <button 
                            onClick={() => setSelectedPayout(payout)}
                            className="w-full mt-2 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-all flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Screenshot
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setSelectedPayout(payout); setRejectionReason(""); }}
                          className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold hover:bg-red-100 transition-all">
                          Reject
                        </button>
                        <button 
                          onClick={() => { setSelectedPayout(payout); handleVerifyPayout("Completed"); }}
                          className="flex-1 py-3 bg-neutral-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all shadow-lg active:scale-95">
                          Approve Payment
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar remains same... */}


        {/* Recent Collections Side-list */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 flex flex-col h-fit">
          <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Collections
          </h3>
          
          <div className="space-y-4">
            {recentCollections.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-10">No recent collections.</p>
            ) : (
              recentCollections.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-neutral-50 bg-neutral-50/50">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-800">{item.deliveryBoyName}</span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(item.collectedAt).toLocaleDateString()} • {item.paymentMode || 'Cash'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-600">+ ₹{item.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
          
          <button className="mt-6 w-full py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all border border-dashed border-neutral-200">
            View All Collections
          </button>
        </div>
      </div>

      {/* Modal */}
      <AgentCollectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleCollectionSuccess}
        agent={selectedAgent}
      />

      {/* Verification Modal (Overlay for rejection or viewing) */}
      <AnimatePresence>
        {selectedPayout && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-neutral-900">Payment Verification</h2>
                <button onClick={() => setSelectedPayout(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-100">
                    <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest mb-4">Payout Details</p>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-xs text-neutral-500 font-bold">Rider</span>
                        <span className="text-xs text-neutral-900 font-black">{selectedPayout.deliveryBoy?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-neutral-500 font-bold">Amount</span>
                        <span className="text-lg text-neutral-900 font-black">₹{selectedPayout.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-neutral-500 font-bold">UTR</span>
                        <span className="text-xs text-neutral-900 font-black">{selectedPayout.utrNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-neutral-900 uppercase tracking-widest mb-3">Rejection Reason (If rejecting)</label>
                    <textarea 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Screenshot mismatch, UTR invalid..."
                      className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Payment Screenshot</p>
                  <div className="rounded-3xl overflow-hidden border-4 border-neutral-50 bg-neutral-50 aspect-[4/5] relative group">
                    <img src={selectedPayout.paymentScreenshot} alt="Proof" className="w-full h-full object-contain" />
                    <a 
                      href={selectedPayout.paymentScreenshot} 
                      target="_blank" 
                      rel="noreferrer"
                      className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="bg-white text-neutral-900 px-4 py-2 rounded-xl text-xs font-black shadow-xl">Open Full Image</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleVerifyPayout("Rejected")}
                  disabled={isVerifying || !rejectionReason}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50">
                  Reject Payout
                </button>
                <button 
                  onClick={() => handleVerifyPayout("Completed")}
                  disabled={isVerifying}
                  className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                  {isVerifying ? "Verifying..." : "Approve & Clear Balance"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

