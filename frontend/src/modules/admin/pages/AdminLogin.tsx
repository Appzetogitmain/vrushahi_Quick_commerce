import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithEmail,
} from "../../../services/api/auth/adminAuthService";
import { useAuth } from "../../../context/AuthContext";
import LogoLatest from "@assets/vrumarket-logo/WhatsApp_Image_2026-07-29_at_16.30.57-removebg-preview.png";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password does not meet complexity requirements.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await loginWithEmail(email, password);
      if (response.success && response.data) {
        // Update AuthContext with token and user data
        login(response.data.token, {
          ...response.data.user,
          userType: "Admin",
        });

        navigate("/admin");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
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
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">
                Email Address
              </label>
              <div className="flex items-center bg-neutral-50/50 border border-green-600/20 rounded-[1.25rem] overflow-hidden focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vrushahi.com"
                  className="flex-1 px-5 py-4 text-base font-medium text-neutral-900 placeholder:text-neutral-300 focus:outline-none bg-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">
                Password
              </label>
              <div className="flex items-center bg-neutral-50/50 border border-green-600/20 rounded-[1.25rem] overflow-hidden focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 px-5 py-4 text-base font-medium text-neutral-900 placeholder:text-neutral-300 focus:outline-none bg-transparent [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-5 text-neutral-400 hover:text-green-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm font-medium text-red-500 bg-red-50 p-4 rounded-[1.25rem] border border-red-100 animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!email || !password || loading}
              className={`w-fit min-w-[12rem] mx-auto block py-3 px-6 rounded-[1rem] font-semibold text-lg transition-all duration-300 relative overflow-hidden group ${
                email && password && !loading
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-[0_10px_20px_rgba(22,163,74,0.3)] translate-y-0 active:translate-y-0.5"
                  : "bg-green-50/50 text-green-300 border border-green-100 cursor-not-allowed"
              }`}
            >
              <span className="relative z-10">
                {loading ? "Authenticating..." : "Login"}
              </span>
              {email && password && !loading && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

