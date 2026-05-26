import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';
import { Phone, Mail, MessageCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

// Icon mapping helper using Lucide React
const getIcon = (iconName: string) => {
  if (iconName === 'phone') return <Phone className="w-5 h-5 text-orange-500" />;
  if (iconName === 'email') return <Mail className="w-5 h-5 text-blue-500" />;
  if (iconName === 'chat') return <MessageCircle className="w-5 h-5 text-green-500" />;
  return <Info className="w-5 h-5 text-neutral-500" />;
};

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || []);
        setContacts(data.contact || []);
      } catch (error) {
        console.error("Failed to load help data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedId(expandedId === index ? null : index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading help content...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      {/* Top Header - Rider name/toggle removed, only Back button and Title */}
      <div className="bg-white px-4 py-4 shadow-sm flex items-center sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="text-neutral-900 text-xl font-semibold">Help & Support</h2>
      </div>

      <div className="px-4 py-4">
        {/* Contact Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-neutral-900 font-semibold">Contact Us</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {contacts.map((option, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                <div>
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.label}</p>
                  <p className="text-neutral-500 text-xs">{option.value}</p>
                </div>
                <div className="p-2 bg-neutral-100 rounded-full">
                  {getIcon(option.icon)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section with Accordion */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-neutral-900 font-semibold">Frequently Asked Questions</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {faqs.map((item, index) => (
              <div key={index} className="bg-white">
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full px-4 py-4 flex justify-between items-center text-left focus:outline-none hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-neutral-900 text-sm font-medium pr-4">
                    {item.question}
                  </span>
                  <span className="text-neutral-400 flex-shrink-0">
                    {expandedId === index ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </span>
                </button>
                
                <div 
                  className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedId === index ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-neutral-500 text-sm leading-relaxed whitespace-pre-wrap pt-1 border-t border-neutral-100">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <DeliveryBottomNav />
    </div>
  );
}
