import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicPolicies, Policy } from "../services/api/customerPolicyService";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "customer" | "delivery" | "seller";
  titleSearch?: string;
}

export default function PolicyModal({ isOpen, onClose, type, titleSearch }: PolicyModalProps) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchPolicy = async () => {
        try {
          setLoading(true);
          const response = await getPublicPolicies(type);
          if (response.success && response.data && response.data.length > 0) {
            let foundPolicy;
            if (titleSearch) {
              foundPolicy = response.data.find((p) =>
                p.title.toLowerCase().includes(titleSearch.toLowerCase())
              ) || response.data[0];
            } else {
              foundPolicy = response.data[0];
            }

            if (foundPolicy) {
              const strippedContent = foundPolicy.content.replace(/(<([^>]+)>)/gi, "").trim();
              
              if (strippedContent.startsWith('http://') || strippedContent.startsWith('https://')) {
                window.open(strippedContent, '_blank');
                onClose();
              } else {
                setPolicy(foundPolicy);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch policy:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPolicy();
    }
  }, [isOpen, type, titleSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">
                {loading ? "Loading Policy..." : policy?.title || "Policy Details"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-all active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
                <p className="text-neutral-500 font-medium">Fetching details...</p>
              </div>
            ) : policy ? (
              <div className="prose prose-neutral max-w-none">
                <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed text-[15px] space-y-4">
                  {policy.content.replace(/\n*Last\s+Updated\s*:\s*[^\n]*/gi, "").trim()}
                </div>
                <div className="mt-12 pt-8 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                  <span>VRUSHAHI QUICK COMMERCE</span>
                  <span>
                    Last updated: {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : "N/A"}
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
                <p className="text-neutral-500 font-medium">Policy details are currently unavailable.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-neutral-50 border-t border-neutral-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-bold text-sm hover:bg-neutral-100 transition-all active:scale-95 shadow-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
