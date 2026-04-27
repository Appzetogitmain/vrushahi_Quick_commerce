import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPublicPolicies, Policy } from "../../services/api/customerPolicyService";

export default function PolicyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "customer";
  const titleParam = searchParams.get("title");
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const response = await getPublicPolicies(type);
        if (response.success && response.data && response.data.length > 0) {
          if (titleParam) {
            const foundPolicy = response.data.find(p => 
              p.title.toLowerCase().includes(titleParam.toLowerCase())
            );
            setPolicy(foundPolicy || response.data[0]);
          } else {
            setPolicy(response.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch policy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [type, titleParam]);

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* Header */}
      <div className="bg-[#f0e6f7] border-b border-neutral-100 pb-4 pt-6 px-4 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-neutral-900">
          {policy?.title || (type === "customer" ? "Customer Policy" : "Privacy Policy")}
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-neutral-500 font-medium text-sm">Loading policy details...</p>
          </div>
        ) : policy ? (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed text-[15px]">
              {policy.content}
            </div>
            <div className="mt-12 pt-8 border-t border-neutral-100 text-xs text-neutral-400">
              Last updated: {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'N/A'}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-neutral-500 font-medium">Policy details are currently unavailable.</p>
          </div>
        )}
      </div>
    </div>
  );
}
