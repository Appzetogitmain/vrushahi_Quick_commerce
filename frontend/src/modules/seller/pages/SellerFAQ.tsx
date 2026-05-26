import React, { useState, useEffect } from "react";
import { getSellerFAQs, SellerFAQ as FAQ } from "../../../services/api/sellerService";

export default function SellerFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend automatically handles role="Seller" or returns "All"
      const response = await getSellerFAQs({ role: "Seller" });
      if (response.success) {
        setFaqs(response.data);
      } else {
        setError("Failed to fetch FAQs");
      }
    } catch (err: any) {
      console.error("Error fetching FAQs:", err);
      setError(err.response?.data?.message || "Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Frequently Asked Questions</h1>
            <p className="text-sm text-gray-500 mt-1">Find answers to common questions about selling on our platform.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={fetchFAQs} className="mt-2 text-sm font-medium text-red-700 hover:text-red-600 underline">Try again</button>
              </div>
            </div>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No FAQs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? "Try adjusting your search terms." : "There are currently no FAQs available."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq) => (
              <div 
                key={faq._id} 
                className={`bg-white rounded-lg border ${expandedId === faq._id ? 'border-teal-500 shadow-md' : 'border-gray-200 shadow-sm'} overflow-hidden transition-all duration-200`}
              >
                <button
                  onClick={() => toggleExpand(faq._id)}
                  className="w-full px-6 py-4 flex justify-between items-center bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <span className="font-medium text-gray-900 text-left pr-4">{faq.question}</span>
                  <span className={`transform transition-transform duration-200 ${expandedId === faq._id ? 'rotate-180 text-teal-600' : 'text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedId === faq._id ? 'max-h-96 py-4 border-t border-gray-100 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
