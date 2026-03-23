import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/adminAuthService";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";
import LogoLatest from "@assets/LogoLatest.png";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      await sendOTP(mobileNumber);
      setShowOTP(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp);
      if (response.success && response.data) {
        // Update AuthContext with token and user data
        login(response.data.token, {
          ...response.data.user,
          userType: "Admin",
        });

        // FCM token registration is handled globally by App.tsx when auth state changes
        // No need to call registerFCMToken here - it would cause duplicate notifications

        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlevrushahiLogin = () => {
    // Handle vrushahi login logic here
    navigate("/admin");
  };

  const handleSellerLogin = () => {
    // Navigate to seller login page
    navigate("/seller/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-green-100 via-slate-50 to-teal-50 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-500">
        {/* Header Section */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
            <img
              src={LogoLatest}
              alt="vrushahi"
              className="relative h-32 w-auto mx-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2 tracking-tight">
            Admin Login
          </h1>
          <p className="text-neutral-500 text-sm font-medium">
            Secure Access for Administrators
          </p>

        </div>

        {/* Login Form */}
        <div className="px-8 pb-10 space-y-6">
          {!showOTP ? (
            /* Mobile Login Form */
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">
                  Mobile Number
                </label>
                <div className="flex items-center bg-neutral-50/50 border border-green-600/20 rounded-[1.25rem] overflow-hidden focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300">
                  <div className="px-4 py-4 text-sm font-bold text-neutral-400 border-r border-green-600/20 bg-neutral-50/50">
                    +91
                  </div>

                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="700 000 0000"
                    className="flex-1 px-5 py-4 text-base font-medium text-neutral-900 placeholder:text-neutral-300 focus:outline-none"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-4 rounded-[1.25rem] border border-red-100 animate-shake">
                  {error}
                </div>
              )}

              <button
                onClick={handleMobileLogin}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-fit min-w-[14rem] mx-auto block py-5 rounded-[1.25rem] font-bold text-lg transition-all duration-300 relative overflow-hidden group ${mobileNumber.length === 10 && !loading
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-[0_10px_20px_rgba(22,163,74,0.3)] translate-y-0 active:translate-y-0.5"
                  : "bg-green-50/50 text-green-300 border border-green-100 cursor-not-allowed"
                  }`}>


                <span className="relative z-10">
                  {loading ? "Sending securely..." : "Continue"}
                </span>
                {mobileNumber.length === 10 && !loading && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                )}
              </button>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">
                  Enter the 4-digit OTP sent to
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-bold text-green-700">
                    +91 {mobileNumber}
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <OTPInput onComplete={handleOTPComplete} disabled={loading} />
              </div>

              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-4 rounded-[1.25rem] border border-red-100 text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 max-w-[8rem] py-6 rounded-[1.25rem] font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 transition-all border border-green-100">
                  Change
                </button>
                <button
                  onClick={handleMobileLogin}
                  disabled={loading}
                  className="flex-1 max-w-[10rem] py-6 rounded-[1.25rem] font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-[0_10px_20px_rgba(22,163,74,0.2)]">
                  {loading ? "Verifying..." : "Resend"}
                </button>

              </div>


            </div>
          )}
        </div>
      </div>


      {/* Footer Text */}
      <p className="mt-6 text-xs text-neutral-500 text-center max-w-md">
        By continuing, you agree to vrushahi's Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
