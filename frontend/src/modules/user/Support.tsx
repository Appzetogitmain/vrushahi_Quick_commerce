import { useNavigate } from "react-router-dom";
import { useAppConfig } from "../../services/configService";

export default function Support() {
  const navigate = useNavigate();
  const { config, loading } = useAppConfig();

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-white pb-6 pt-4 sticky top-0 z-10 border-b border-neutral-100">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-neutral-900 hover:text-purple-600 transition-colors"
              aria-label="Back">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-neutral-900">Support</h1>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden mb-6">
          <div className="divide-y divide-neutral-100">
            {/* About Us */}
            <button
              onClick={() => navigate("/about-us")}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3 md:gap-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 group-hover:text-purple-600 transition-colors duration-200">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                  About Us
                </span>
              </div>
              <span className="text-neutral-400 md:text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-200">›</span>
            </button>

            {/* Privacy Policy */}
            <button
              onClick={() => navigate("/privacy-policy")}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3 md:gap-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 group-hover:text-purple-600 transition-colors duration-200">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                  Privacy Policy
                </span>
              </div>
              <span className="text-neutral-400 md:text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-200">›</span>
            </button>

            {/* Terms & Conditions */}
            <button
              onClick={() => navigate("/policy?type=customer&title=Terms & Conditions")}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3 md:gap-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 group-hover:text-purple-600 transition-colors duration-200">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15L11 17L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                  Terms & Conditions
                </span>
              </div>
              <span className="text-neutral-400 md:text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-200">›</span>
            </button>

            {/* Refund and Cancellation Policy */}
            <button
              onClick={() => navigate("/policy?type=customer&title=Refund and Cancellation Policy")}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3 md:gap-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 group-hover:text-purple-600 transition-colors duration-200">
                  <path d="M9 14L4 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                  Refund and Cancellation Policy
                </span>
              </div>
              <span className="text-neutral-400 md:text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-200">›</span>
            </button>

          </div>
        </div>

        {/* Contact Info Card */}
        {(!loading && (config.contactPhone || config.contactEmail)) && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-base font-bold text-neutral-900 mb-4">Contact Us</h3>
            <div className="space-y-4">
              {config.contactPhone && (
                <a 
                  href={`tel:${config.contactPhone}`} 
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-purple-50/40 transition-colors group"
                >
                  <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Call Support</p>
                    <p className="text-sm font-bold text-neutral-800 mt-0.5">{config.contactPhone}</p>
                  </div>
                </a>
              )}

              {config.contactEmail && (
                <a 
                  href={`mailto:${config.contactEmail}`} 
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-purple-50/40 transition-colors group"
                >
                  <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email Support</p>
                    <p className="text-sm font-bold text-neutral-800 mt-0.5">{config.contactEmail}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
