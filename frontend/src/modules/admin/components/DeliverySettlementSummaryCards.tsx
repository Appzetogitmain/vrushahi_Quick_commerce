import React from 'react';

interface DeliverySettlementSummaryCardsProps {
  stats: {
    totalPartnerEarnings: number;
    paidToPartner: number;
    partnerWalletBalance: number;
  };
  loading: boolean;
}

const DeliverySettlementSummaryCards: React.FC<DeliverySettlementSummaryCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'TOTAL PARTNER EARNINGS',
      value: `₹${stats.totalPartnerEarnings.toLocaleString()}`,
      description: 'System calculated earnings',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'PAID TO PARTNER',
      value: `₹${stats.paidToPartner.toLocaleString()}`,
      description: 'Total payouts processed',
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'PARTNER WALLET BALANCE',
      value: `₹${stats.partnerWalletBalance.toLocaleString()}`,
      description: 'Available for payout',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-lg ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              card.color === 'green' ? 'bg-green-50 text-green-600' :
              'bg-red-50 text-red-600'
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
                  card.color === 'green' ? 'text-green-600' :
                  card.color === 'red' ? 'text-red-600' :
                  'text-neutral-900'
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

export default DeliverySettlementSummaryCards;
