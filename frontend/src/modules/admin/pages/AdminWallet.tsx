import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { useToast } from '../../../context/ToastContext';
import {
  getFinancialDashboard,
  getWalletTransactions,
  getAdminEarnings,
  WalletStats,
  WalletTransaction,
  AdminEarning
} from '../../../services/api/admin/adminWalletService';
import AdminWithdrawals from './AdminWithdrawals';

// Icons
const WalletIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 7h-9a2 2 0 0 0-2 2v1m0 4v9a2 2 0 0 0 2 2h4" />
    <path d="M19 13h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1" />
    <path d="M6 7H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h15v4H6.5" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DollarSignIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function AdminWallet() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'transactions' | 'earnings' | 'withdrawals'>('transactions');
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Transactions State
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [trxLoading, setTrxLoading] = useState(false);
  const [trxFilter, setTrxFilter] = useState({ userType: '', type: '' });

  // Earnings State
  const [earnings, setEarnings] = useState<AdminEarning[]>([]);
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnPage, setEarnPage] = useState(1);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [activeTab, trxFilter]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await getFinancialDashboard();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
      showToast('Failed to load wallet stats', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTransactions = async () => {
    setTrxLoading(true);
    try {
      const response = await getWalletTransactions({
        userType: trxFilter.userType || undefined,
        type: trxFilter.type || undefined
      });
      if (response.success && response.data) {
        setTransactions(response.data);
      }
    } catch (error: any) {
      showToast('Failed to load transactions', 'error');
    } finally {
      setTrxLoading(false);
    }
  };

  const fetchEarnings = async () => {
    setEarnLoading(true);
    try {
      const response = await getAdminEarnings({ page: earnPage });
      if (response.success && response.data) {
        setEarnings(response.data);
      }
    } catch (error: any) {
      showToast('Failed to load earnings', 'error');
    } finally {
      setEarnLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const liquidityData = stats?.liquidity ? [
    { name: 'Cash (Field)', value: stats.liquidity.cash },
    { name: 'Online (Platform)', value: stats.liquidity.online }
  ] : [];

  const profitData = stats?.profitBreakdown ? [
    { name: 'Seller Comm.', value: stats.profitBreakdown.productCommission },
    { name: 'Delivery Comm.', value: stats.profitBreakdown.deliveryCommission },
    { name: 'Platform Fees', value: stats.profitBreakdown.platformFees }
  ] : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Wallet & Finance</h1>
          <div className="flex items-center gap-2 mt-2 text-gray-500">
            <ShieldIcon className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium">Verified Financial Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={fetchStats}
          disabled={loadingStats}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshIcon className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Total Sales Volume (GMV)"
          value={`₹${stats?.totalGMV?.toLocaleString('en-IN') || '0'}`}
          icon={TrendingUpIcon}
          color="text-blue-600"
          bg="bg-blue-50"
          description="Total value of all orders"
        />
        <StatsCard
          title="Total Admin Profits"
          value={`₹${stats?.totalAdminEarnings?.toLocaleString('en-IN') || '0.00'}`}
          icon={DollarSignIcon}
          color="text-purple-600"
          bg="bg-purple-50"
          description="Total commissions & fees earned"
        />
        <StatsCard
          title="Available Cash Balance"
          value={`₹${stats?.currentAccountBalance?.toLocaleString('en-IN') || '0'}`}
          icon={WalletIcon}
          color="text-emerald-600"
          bg="bg-emerald-50"
          description="Actual cash held by platform"
        />
      </div>

      {/* Secondary Stats Row (Liabilities) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MiniCard 
          title="Total COD in Field" 
          value={stats?.pendingFromDeliveryBoy || 0}
          icon={ClockIcon}
          color="text-orange-500"
          label="Physical cash with riders"
        />
        <MiniCard 
          title="Seller Pending Payouts" 
          value={stats?.sellerPendingPayouts || 0}
          icon={CreditCardIcon}
          color="text-blue-500"
          label="Owed to sellers"
        />
        <MiniCard 
          title="Delivery Boy Pending Payouts" 
          value={stats?.deliveryPendingPayouts || 0}
          icon={CreditCardIcon}
          color="text-indigo-500"
          label="Owed to delivery partners"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Graph */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg">7-Day Sales Trend</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">Live Trend</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.performance || []}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdowns */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Liquidity Split</h3>
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liquidityData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {liquidityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {liquidityData.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{item.name}</span>
                  <span className="font-bold text-gray-900">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <TabButton
            active={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
            label="All Transactions"
            icon={CreditCardIcon}
          />
          <TabButton
            active={activeTab === 'earnings'}
            onClick={() => setActiveTab('earnings')}
            label="Profit Ledger"
            icon={TrendingUpIcon}
          />
          <TabButton
            active={activeTab === 'withdrawals'}
            onClick={() => setActiveTab('withdrawals')}
            label="Withdrawals"
            icon={WalletIcon}
            badge={stats?.pendingWithdrawalsCount}
          />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'transactions' && (
              <motion.div 
                key="trx"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <FilterButton 
                      active={trxFilter.userType === ''} 
                      onClick={() => setTrxFilter({...trxFilter, userType: ''})}
                      label="All Users"
                    />
                    <FilterButton 
                      active={trxFilter.userType === 'SELLER'} 
                      onClick={() => setTrxFilter({...trxFilter, userType: 'SELLER'})}
                      label="Sellers"
                    />
                    <FilterButton 
                      active={trxFilter.userType === 'DELIVERY_BOY'} 
                      onClick={() => setTrxFilter({...trxFilter, userType: 'DELIVERY_BOY'})}
                      label="Riders"
                    />
                  </div>
                  
                  <select
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    value={trxFilter.type}
                    onChange={(e) => setTrxFilter({ ...trxFilter, type: e.target.value })}
                  >
                    <option value="">All Types</option>
                    <option value="Credit">Credit Only</option>
                    <option value="Debit">Debit Only</option>
                  </select>
                </div>

                {/* Transactions Table */}
                {trxLoading ? (
                  <LoadingSpinner />
                ) : transactions.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-4 px-6 font-bold">Transaction Info</th>
                          <th className="py-4 px-6 font-bold">User Details</th>
                          <th className="py-4 px-6 font-bold">Reference</th>
                          <th className="py-4 px-6 font-bold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {transactions.map((trx) => (
                          <tr key={trx._id} className="hover:bg-gray-50/50 transition">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">{trx.description}</span>
                                <span className="text-xs text-gray-400 mt-0.5">{new Date(trx.createdAt).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  trx.userType === 'SELLER' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                                }`}>
                                  {trx.userType ? trx.userType[0] : '?'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900">{(trx as any).userName || 'Unknown'}</span>
                                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                                    {trx.userType ? trx.userType.replace('_', ' ') : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-mono text-xs text-gray-400">{trx.reference}</span>
                            </td>
                            <td className={`py-4 px-6 text-right font-bold text-base ${
                              trx.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {trx.type === 'Credit' ? '+' : '-'}₹{trx.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="No transactions found." />
                )}
              </motion.div>
            )}

            {activeTab === 'earnings' && (
              <motion.div 
                key="earn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {earnLoading ? (
                  <LoadingSpinner />
                ) : earnings.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-4 px-6 font-bold">Source Order</th>
                          <th className="py-4 px-6 font-bold">Reason</th>
                          <th className="py-4 px-6 font-bold">Status</th>
                          <th className="py-4 px-6 font-bold text-right">Admin Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {earnings.map((earning) => (
                          <tr key={earning.id} className="hover:bg-gray-50/50 transition">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">{earning.source}</span>
                                <span className="text-xs text-gray-400">{new Date(earning.date).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-600">
                              {earning.description}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                earning.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {earning.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-emerald-600 text-lg">
                              ₹{earning.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="No profit records found." />
                )}
              </motion.div>
            )}

            {activeTab === 'withdrawals' && (
              <AdminWithdrawals />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
  bg: string;
  description?: string;
}

function StatsCard({ title, value, icon: Icon, color, bg, description }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full transition-all hover:shadow-xl hover:shadow-blue-500/5 group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Real-Time</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>
      </div>
      <div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">{value}</h3>
        {description && (
          <div className="pt-4 border-t border-gray-50">
            <p className="text-[11px] text-gray-400 font-semibold flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${bg.replace('bg-', 'bg-').split(' ')[0]}`} />
              {description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface MiniCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
  label: string;
}

function MiniCard({ title, value, icon: Icon, color, label }: MiniCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
      <div className={`p-3 rounded-xl bg-gray-50 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{title}</p>
        <h4 className="text-xl font-bold text-gray-900 tracking-tight">₹{value.toLocaleString()}</h4>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: any;
  badge?: number;
}

function TabButton({ active, onClick, label, icon: Icon, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-8 py-5 font-bold text-xs uppercase tracking-widest transition relative whitespace-nowrap ${active
        ? 'text-blue-600 border-b-4 border-blue-600 bg-white'
        : 'text-gray-400 hover:text-gray-700'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge && badge > 0 ? (
        <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black ml-1 shadow-lg shadow-rose-500/20">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function FilterButton({ active, onClick, label }: FilterButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-gray-100 border-t-blue-600"></div>
      <p className="text-gray-400 text-xs font-bold animate-pulse">Aggregating Financial Data...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="bg-gray-50 p-6 rounded-full mb-4">
        <CreditCardIcon className="w-12 h-12 opacity-20" />
      </div>
      <p className="font-bold text-sm">{message}</p>
    </div>
  );
}
