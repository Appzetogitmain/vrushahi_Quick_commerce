import React from 'react';

interface CashSummaryCardsProps {
  stats: {
    totalCodCollected: number;
    totalSubmitted: number;
    pendingAmount: number;
    agentsWithPending: number;
  };
  loading: boolean;
}

const CashSummaryCards: React.FC<CashSummaryCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Total COD Collected',
      value: `₹${stats.totalCodCollected.toLocaleString()}`,
      description: 'Gross cash with riders',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Total Submitted',
      value: `₹${stats.totalSubmitted.toLocaleString()}`,
      description: 'Cash in admin wallet',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Pending Amount',
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      description: 'Yet to be collected',
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Agents with Pending',
      value: stats.agentsWithPending.toString(),
      description: 'Active riders with cash',
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-lg ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              card.color === 'green' ? 'bg-green-50 text-green-600' :
              card.color === 'red' ? 'bg-red-50 text-red-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              {card.icon}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-1">{card.title}</h3>
            {loading ? (
              <div className="h-8 w-24 bg-neutral-100 animate-pulse rounded"></div>
            ) : (
              <div className="flex flex-col">
                <span className={`text-2xl font-bold ${
                  card.color === 'red' ? 'text-red-600' : 'text-neutral-900'
                }`}>
                  {card.value}
                </span>
                <span className="text-xs text-neutral-400 mt-1">{card.description}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CashSummaryCards;
