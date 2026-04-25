import { useState, useEffect, useCallback } from "react";
import {
  getCashCollectionStats,
  getAgentsCashSummary,
  getRecentCollections,
  type CashCollectionStats,
  type AgentCashSummary,
} from "../../../services/api/admin/adminCashService";
import { useAuth } from "../../../context/AuthContext";
import CashSummaryCards from "../components/CashSummaryCards";
import AgentCollectModal from "../components/AgentCollectModal";
import LoadingSpinner from "../../../components/LoadingSpinner";

export default function AdminCashCollection() {
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats & Data
  const [stats, setStats] = useState<CashCollectionStats>({
    totalCodCollected: 0,
    totalSubmitted: 0,
    pendingAmount: 0,
    agentsWithPending: 0,
  });
  const [agents, setAgents] = useState<AgentCashSummary[]>([]);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentCashSummary | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      setError(null);

      const [statsRes, agentsRes, recentRes] = await Promise.all([
        getCashCollectionStats(),
        getAgentsCashSummary(searchTerm),
        getRecentCollections({ limit: 10 })
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (agentsRes.success) setAgents(agentsRes.data);
      if (recentRes.success) setRecentCollections(recentRes.data);

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

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Cash Collection</h1>
          <p className="text-neutral-500 mt-1">Track and reconcile COD payments from delivery riders.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search rider name/mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none w-64 transition-all shadow-sm group-hover:border-neutral-300"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 shadow-sm">
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="text-sm outline-none bg-transparent" />
            <span className="text-neutral-300">|</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="text-sm outline-none bg-transparent" />
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Table Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/30">
            <h2 className="text-lg font-bold text-neutral-900">Delivery Agent COD Summary</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 text-neutral-500 text-[11px] uppercase tracking-wider font-bold border-b border-neutral-100">
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4 text-right">Collected</th>
                  <th className="px-6 py-4 text-right text-red-600">Pending</th>
                  <th className="px-6 py-4">Last Submission</th>
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
                    <tr key={agent._id} className={`hover:bg-neutral-50/50 transition-colors ${agent.pending > 0 ? 'bg-red-50/10' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-900">{agent.name}</span>
                          <span className="text-xs text-neutral-500">{agent.mobile}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutral-600">
                        ₹{agent.cashCollected.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">
                        ₹{agent.pending.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-500 italic">
                          {agent.lastSubmissionDate ? new Date(agent.lastSubmissionDate).toLocaleDateString() : 'Never'}
                        </span>
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
                        <button
                          onClick={() => handleCollectClick(agent)}
                          disabled={agent.pending <= 0}
                          className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-30"
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
    </div>
  );
}
