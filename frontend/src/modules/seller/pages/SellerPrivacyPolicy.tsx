import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPublicPolicies, Policy } from "../../../services/api/customerPolicyService";

export default function SellerPrivacyPolicy() {
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const response = await getPublicPolicies("seller");
        if (response.success && response.data && response.data.length > 0) {
          const foundPolicy = response.data.find(p => 
            p.title.toLowerCase().includes("privacy")
          ) || response.data.find(p =>
            p.title.toLowerCase().includes("seller")
          );
          setPolicy(foundPolicy || response.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch seller privacy policy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-50 flex flex-col font-sans pb-20">
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-blue-100/50 pb-4 pt-6 px-6 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18L9 12L15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Privacy Policy
          </h1>
          {!loading && policy?.version && (
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">
              Version {policy.version}
            </p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-[2rem] border border-blue-100/50 shadow-[0_15px_30px_rgba(0,0,0,0.02)] p-6 sm:p-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-neutral-500 font-medium text-sm">Fetching policy details...</p>
            </div>
          ) : policy ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed text-[15px] space-y-4">
                {policy.content.replace(/^(?:Last\s+Updated|Last\s+updated)\s*:\s*[^\n]*\n*/i, "").trim()}
              </div>
              <div className="mt-12 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-neutral-400 font-medium">
                <span>VRUSHAHI SELLER PARTNER APP</span>
                <span>
                  Last updated: {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-neutral-500 font-medium">Privacy Policy details are currently unavailable.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
