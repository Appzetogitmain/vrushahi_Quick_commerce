import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/config";

interface SupportSettings {
  supportEmail?: string;
  supportPhone?: string;
}

export default function SellerSupport() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get("/customer/home/settings");
        if (response.data.success) {
          setSettings(response.data.data);
        } else {
          setError("Failed to fetch support settings");
        }
      } catch (err: any) {
        console.error("Error fetching support settings:", err);
        setError("Failed to load support settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-all active:scale-95 shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Support & Contact</h1>
            <p className="text-sm text-gray-500 mt-1">
              Get in touch with us if you need any assistance with your seller account.
            </p>
          </div>
        </div>

        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-[10px] bg-white/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest">
              Seller Help Desk
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-3 mb-2">
              Need help managing your store?
            </h2>
            <p className="text-teal-50/90 text-sm leading-relaxed">
              Our support team is dedicated to assisting you with order processing, store settings, payouts, inventory updates, and account approvals. Get quick resolutions to keep your store operating smoothly.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center">
              <a 
                href={`mailto:${settings?.supportEmail || "support@example.com"}`}
                className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 hover:bg-teal-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Support</h3>
              <p className="text-gray-500 text-sm mb-4">Send us an email anytime and we will get back to you.</p>
              <a
                href={`mailto:${settings?.supportEmail || "support@example.com"}`}
                className="text-teal-600 font-medium hover:text-teal-700 hover:underline"
              >
                {settings?.supportEmail || "Not available"}
              </a>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center">
              <a 
                href={`tel:${settings?.supportPhone || "1234567890"}`}
                className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 hover:bg-teal-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Phone Support</h3>
              <p className="text-gray-500 text-sm mb-4">Call us directly during business hours for immediate help.</p>
              <a
                href={`tel:${settings?.supportPhone || "1234567890"}`}
                className="text-teal-600 font-medium hover:text-teal-700 hover:underline"
              >
                {settings?.supportPhone || "Not available"}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
