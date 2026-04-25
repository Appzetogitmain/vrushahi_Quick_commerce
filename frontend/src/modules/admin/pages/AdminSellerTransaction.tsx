import { useState, useEffect, useCallback } from "react";
import {
  getWalletTransactions,
  getSellerSettlementStats,
  type WalletTransaction,
  type SellerSettlementStats,
} from "../../../services/api/admin/adminWalletService";
import { getAllSellers as getSellers } from "../../../services/api/sellerService";
import { useAuth } from "../../../context/AuthContext";
import SettlementSummaryCards from "../components/SettlementSummaryCards";
import SettlementModal from "../components/SettlementModal";
import LoadingSpinner from "../../../components/LoadingSpinner";

interface Seller {
  _id: string;
  sellerName: string;
  storeName: string;
  balance: number;
}

export default function AdminSellerTransaction() {
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats & Data
  const [stats, setStats] = useState<SellerSettlementStats>({
    totalSellerEarnings: 0,
    codReceived: 0,
    alreadyPaid: 0,
    availableToSettle: 0,
    pendingCod: 0,
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  
  // Filters
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch Sellers
      const sellersRes = await getSellers({ status: "Approved" });
      if (sellersRes.success) {
        setSellers(sellersRes.data.map((s: any) => ({
          _id: s._id,
          sellerName: s.sellerName,
          storeName: s.storeName,
          balance: s.balance || 0
        })));
      }

      // Fetch Stats
      const statsRes = await getSellerSettlementStats(selectedSeller === "all" ? undefined : selectedSeller);
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Fetch Transactions (Ledger)
      const params: any = {
        page: currentPage,
        limit: entriesPerPage,
        userType: "SELLER",
      };
      if (selectedSeller !== "all") params.userId = selectedSeller;
      if (selectedType !== "all") params.type = selectedType;
      // Search and date filtering would be handled by API if implemented, otherwise frontend
      
      const txRes = await getWalletTransactions(params);
      if (txRes.success) {
        setTransactions(txRes.data);
        setTotalEntries(txRes.pagination?.total || txRes.data.length);
      }
    } catch (err: any) {
      console.error("Error fetching settlement data:", err);
      setError(err.response?.data?.message || "Failed to load settlement data");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, selectedSeller, selectedType, currentPage, entriesPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettleSuccess = () => {
    fetchData();
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Seller Settlement</h1>
          <p className="text-neutral-500 mt-1">Manage seller earnings and payouts with precision.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search by ID or Note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none w-64 transition-all shadow-sm group-hover:border-neutral-300"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Settle Payment
          </button>
        </div>
      </div>

      {/* Admin Guide Section */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all hover:bg-blue-50">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1 pr-8">
            <h3 className="text-sm font-bold text-blue-900">Admin Settlement Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-blue-700/80 leading-relaxed">
              <p><span className="font-bold text-blue-800">Earnings:</span> Total money sellers earned from orders.</p>
              <p><span className="font-bold text-blue-800">Received:</span> Real cash in your hand (Cash Collection + Online Payments).</p>
              <p><span className="font-bold text-blue-800">Available:</span> Safe amount to pay sellers (Received - Already Paid).</p>
              <p><span className="font-bold text-blue-800">Pending:</span> COD money currently held by delivery boys.</p>
            </div>
            <p className="text-[10px] text-blue-500 pt-1 italic underline decoration-blue-200 underline-offset-4 font-medium">
              Note: Payouts are strictly limited by your Available balance to maintain financial integrity.
            </p>
          </div>
        </div>
        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg className="w-12 h-12 text-blue-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
      </div>

      {/* Summary Cards */}
      <SettlementSummaryCards stats={stats} loading={loading && transactions.length === 0} />

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSeller}
              onChange={(e) => { setSelectedSeller(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 outline-none cursor-pointer hover:border-neutral-300 transition-all"
            >
              <option value="all">All Sellers</option>
              {sellers.map(s => <option key={s._id} value={s._id}>{s.storeName}</option>)}
            </select>

            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 outline-none cursor-pointer hover:border-neutral-300 transition-all"
            >
              <option value="all">All Types</option>
              <option value="Credit">Order Earning</option>
              <option value="Debit">Seller Payout</option>
            </select>
            
            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5">
              <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="text-xs outline-none bg-transparent" />
              <span className="text-neutral-300">|</span>
              <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="text-xs outline-none bg-transparent" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Show</span>
            <select 
              value={entriesPerPage} 
              onChange={e => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent font-bold text-neutral-900 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 text-neutral-500 text-[11px] uppercase tracking-wider font-bold border-b border-neutral-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Seller</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Ref ID</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Credit</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <LoadingSpinner />
                      <span className="text-sm text-neutral-400 font-medium">Fetching ledger entries...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="text-red-500 font-medium">{error}</div>
                    <button onClick={fetchData} className="mt-2 text-sm text-neutral-900 font-bold hover:underline">Try Again</button>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-neutral-400 font-medium">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] text-neutral-400">{new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-neutral-700">{tx.userName || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        tx.type === 'Credit' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${tx.type === 'Credit' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {tx.type === 'Credit' ? 'Earning' : 'Payout'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-900 transition-colors">#{tx.reference.slice(-8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral-600 max-w-[200px] truncate" title={tx.description}>{tx.description}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-red-600">
                        {tx.type === 'Debit' ? `- ₹${tx.amount.toLocaleString()}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-green-600">
                        {tx.type === 'Credit' ? `+ ₹${tx.amount.toLocaleString()}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        tx.status === 'Completed' ? 'text-blue-600 bg-blue-50' : 'text-yellow-600 bg-yellow-50'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">
            Showing {Math.min(totalEntries, (currentPage - 1) * entriesPerPage + 1)} to {Math.min(totalEntries, currentPage * entriesPerPage)} of {totalEntries} entries
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold shadow-md">
              Page {currentPage}
            </div>
            <button 
              disabled={currentPage * entriesPerPage >= totalEntries}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Settlements Section (Optional/Simplified) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* We can add a chart here if needed in future */}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Actions
          </h3>
          <div className="space-y-3">
             <button onClick={() => setIsModalOpen(true)} className="w-full text-left px-4 py-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors flex items-center justify-between group">
               <div>
                 <p className="text-sm font-bold text-neutral-800">Process New Payout</p>
                 <p className="text-xs text-neutral-400">Instantly settle seller balances</p>
               </div>
               <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
             </button>
             <button className="w-full text-left px-4 py-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors flex items-center justify-between group opacity-50 cursor-not-allowed">
               <div>
                 <p className="text-sm font-bold text-neutral-800">Download Report</p>
                 <p className="text-xs text-neutral-400">Generate settlement summary CSV</p>
               </div>
               <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <SettlementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSettleSuccess}
        sellers={sellers}
        availableGlobal={stats.availableToSettle}
      />
    </div>
  );
}
