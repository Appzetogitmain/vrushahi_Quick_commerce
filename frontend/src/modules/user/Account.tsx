import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  CustomerProfile,
  sendDeleteOtp,
  deleteAccount,
} from "../../services/api/customerService";
import CartIconButton from "../../components/CartIconButton";
import { useToast } from "../../context/ToastContext";



export default function Account() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();


  // Edit Profile State
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    dateOfBirth: "",
  });


  // Delete Account States & Flow
  const [deleteStep, setDeleteStep] = useState(0); // 0 = Closed, 1 = Warning, 2 = OTP Re-Auth, 3 = Confirmation Text
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const startDeleteFlow = () => {
    setDeleteStep(1);
    setDeleteOtp("");
    setDeleteConfirmText("");
  };

  const handleSendDeleteOtp = async () => {
    try {
      setOtpSending(true);
      const res = await sendDeleteOtp();
      if (res.success) {
        showToast(res.message || "OTP sent successfully to registered number", "success");
        setDeleteStep(2);
      } else {
        showToast(res.message || "Failed to send OTP", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtpAndNext = () => {
    if (!deleteOtp || !/^[0-9]{4}$/.test(deleteOtp)) {
      showToast("Please enter a valid 4-digit verification OTP", "error");
      return;
    }
    setDeleteStep(3);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== "DELETE") {
      showToast("Please type DELETE to confirm", "error");
      return;
    }

    try {
      setDeleting(true);
      const res = await deleteAccount({ otp: deleteOtp, confirmText: "DELETE" });
      if (res.success) {
        showToast("Your account has been deleted successfully", "success");
        setDeleteStep(0);
        authLogout();
        navigate("/login");
      } else {
        showToast(res.message || "Deletion failed", "error");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Deletion failed";
      showToast(errMsg, "error");
      if (errMsg.toLowerCase().includes("otp")) {
        setDeleteStep(2); // Send back to OTP step if OTP is invalid
      }
    } finally {
      setDeleting(false);
    }
  };


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getProfile();
        if (response.success) {
          setProfile(response.data);
        } else {
          setError("Failed to load profile");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
        if (err.response?.status === 401) {
          authLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.userType === "Customer") {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, navigate, authLogout]);

  // Lock background scroll when Delete Modal is active
  useEffect(() => {
    if (deleteStep > 0) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [deleteStep]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };


  const openEditModal = () => {
    setEditData({
      name: profile?.name || "",
      email: profile?.email || "",
      dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const response = await updateProfile(editData);
      if (response.success) {
        setProfile(response.data);
        showToast("Profile updated successfully", "success");
        setShowEditModal(false);
      } else {
        showToast(response.message || "Update failed", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setUpdating(false);
    }
  };


  // Show login/signup prompt for unregistered users
  if (!user) {
    return (
      <div className="pb-24 md:pb-16 bg-white md:bg-[#faf9fc] min-h-screen font-sans md:flex md:items-center md:justify-center md:px-4">
        <div className="w-full md:max-w-md md:bg-white md:rounded-3xl md:border md:border-purple-100/80 md:shadow-[0_15px_40px_rgba(240,230,247,0.35)] md:p-8 overflow-hidden transition-all duration-300">
          <div className="bg-[#f0e6f7] md:bg-transparent border-b border-neutral-100 md:border-b-0 pb-3 md:pb-0 pt-4 md:pt-0 text-neutral-900">
            <div className="px-4 md:px-0">
              <div className="flex items-center justify-between mb-1 md:mb-6">
                <button
                  onClick={() => navigate(-1)}
                  className="text-neutral-900 hover:bg-black/5 md:hover:bg-neutral-100 md:bg-neutral-50 p-1 md:p-2 rounded-full transition-colors"
                  aria-label="Back">
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
              </div>
              <div className="flex flex-col items-center mb-2 md:mb-6">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/40 md:bg-purple-50 flex items-center justify-center mb-1.5 md:mb-4 border-2 border-white/60 md:border-purple-100/50 shadow-sm backdrop-blur-sm">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-neutral-900 md:text-purple-600 md:w-12 md:h-12">
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h1 className="text-lg md:text-2xl font-black text-neutral-900 mb-0.5 md:mb-1.5">
                  Welcome!
                </h1>
                <p className="text-xs md:text-sm text-neutral-600 font-medium text-center px-4 md:px-0 leading-relaxed">
                  Login to access your profile, orders, and more
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-0 mt-6 md:mt-0">
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl font-bold text-base bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 md:shadow-purple-100/50 uppercase tracking-wide border-none cursor-pointer">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || "User";
  const displayPhone = profile?.phone || user?.phone || "";
  const displayDateOfBirth = profile?.dateOfBirth;

  return (
    <div className="pb-24 md:pb-16 bg-white md:bg-[#fcfaff] min-h-screen font-sans">
      {/* Structural Container for Responsive Layout */}
      <div className="max-w-6xl mx-auto md:px-8 md:py-10">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 md:items-start">
          
          {/* Left Column (Sticky Profile Card / Top Mobile Header) */}
          <div className="md:col-span-4 w-full md:sticky md:top-6">
            <div className="bg-[#f0e6f7] border-b border-neutral-100 pb-3 md:pb-8 pt-4 md:pt-8 text-neutral-900 md:bg-gradient-to-br md:from-[#f3ebf9] md:to-[#e8daf2] md:rounded-3xl md:border md:border-purple-100/80 md:shadow-[0_12px_40px_rgba(240,230,247,0.4)] md:p-6 md:text-center transition-all duration-300">
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-1 md:mb-6">
                  <button
                    onClick={() => navigate(-1)}
                    className="text-neutral-900 hover:bg-black/5 md:bg-white md:hover:bg-white md:hover:scale-105 md:shadow-sm p-1 md:p-2 rounded-full transition-all"
                    aria-label="Back">
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
                  <button 
                    onClick={openEditModal}
                    className="p-1 md:p-2 rounded-full hover:bg-black/5 md:bg-white md:hover:bg-white md:hover:scale-105 md:shadow-sm transition-all text-purple-600"
                    aria-label="Edit Profile"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col items-center mb-2 md:mb-0">
                  <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-white/40 md:bg-white/60 flex items-center justify-center mb-1.5 md:mb-4 border-2 border-white/60 md:border-white/80 shadow-sm md:shadow-md backdrop-blur-sm transition-transform duration-300 hover:scale-105">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-900 md:w-12 md:h-12 text-neutral-800">

                      <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h1 className="text-lg md:text-2xl font-black text-neutral-900 mb-0.5 md:mb-2 tracking-tight">
                    {displayName}
                  </h1>

                  <div className="flex flex-col items-center gap-1 md:gap-2.5 text-[10px] md:text-xs text-neutral-600 font-bold md:font-medium md:mt-1">
                    {displayPhone && (
                      <div className="flex items-center gap-1.5 md:gap-2 bg-white/30 md:bg-white/50 md:px-3 md:py-1.5 md:rounded-full md:border md:border-white/40 md:shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="md:w-3.5 md:h-3.5 text-purple-700">
                          <path
                            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="md:text-neutral-800 md:font-semibold">{displayPhone}</span>
                      </div>
                    )}
                    {displayDateOfBirth && (
                      <div className="flex items-center gap-1.5 md:gap-2 bg-white/30 md:bg-white/50 md:px-3 md:py-1.5 md:rounded-full md:border md:border-white/40 md:shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="md:w-3.5 md:h-3.5 text-purple-700">
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <line
                            x1="16"
                            y1="2"
                            x2="16"
                            y2="6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <line
                            x1="8"
                            y1="2"
                            x2="8"
                            y2="6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <line
                            x1="3"
                            y1="10"
                            x2="21"
                            y2="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="md:text-neutral-800 md:font-semibold">{formatDate(displayDateOfBirth)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Rest of Details / Menu Options) */}
          <div className="md:col-span-8 w-full md:mt-0 mt-0">
            <div className="px-4 md:px-0 -mt-4 md:mt-0 mb-4 md:mb-6">
              <div className="grid grid-cols-2 gap-2.5 md:gap-6 max-w-2xl md:max-w-none md:mx-0">
                <button
                  onClick={() => navigate("/orders")}
                  className="bg-white rounded-lg md:rounded-2xl border border-neutral-200 md:border-neutral-200/80 p-3 md:p-6 hover:shadow-md md:hover:shadow-lg md:hover:border-purple-200 md:hover:scale-[1.01] md:bg-gradient-to-br md:from-white md:to-neutral-50/40 transition-all duration-300 text-center outline-none cursor-pointer group">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mx-auto mb-1.5 md:mb-3 text-neutral-700 md:text-purple-600 md:w-8 md:h-8 transition-transform duration-300 group-hover:scale-105">
                    <path
                      d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="3"
                      y1="6"
                      x2="21"
                      y2="6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 10a4 4 0 0 1-8 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-[10px] md:text-sm font-semibold md:font-bold text-neutral-900 md:text-neutral-800">
                    Your orders
                  </div>
                </button>
                <button
                  onClick={() => navigate("/faq")}
                  className="bg-white rounded-lg md:rounded-2xl border border-neutral-200 md:border-neutral-200/80 p-3 md:p-6 hover:shadow-md md:hover:shadow-lg md:hover:border-purple-200 md:hover:scale-[1.01] md:bg-gradient-to-br md:from-white md:to-neutral-50/40 transition-all duration-300 text-center outline-none cursor-pointer group">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mx-auto mb-1.5 md:mb-3 text-neutral-700 md:text-purple-600 md:w-8 md:h-8 transition-transform duration-300 group-hover:scale-105">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-[10px] md:text-sm font-semibold md:font-bold text-neutral-900 md:text-neutral-800">
                    Need help?
                  </div>
                </button>
              </div>
            </div>

            <div className="px-4 md:px-0 py-2.5 md:py-0">
              <h2 className="text-xs font-bold text-neutral-900 md:text-[#94a3b8] md:text-[11px] md:font-extrabold md:tracking-wider mb-2 md:mb-3 uppercase">
                Your information
              </h2>
              <div className="bg-white rounded-lg md:rounded-2xl border border-neutral-200 md:border-neutral-200/80 overflow-hidden divide-y divide-neutral-100 md:divide-neutral-100/60 md:shadow-sm">
                <button
                  onClick={() => navigate("/cart")}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 md:group-hover:text-purple-600 md:w-5 md:h-5 transition-colors duration-200">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[13px] md:text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                      My Cart
                    </span>
                  </div>
                  <span className="text-neutral-400 md:text-neutral-300 md:group-hover:text-purple-600 md:group-hover:translate-x-0.5 transition-all duration-200">›</span>
                </button>
                <button
                  onClick={() => navigate("/address-book")}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-500 md:text-neutral-400 md:group-hover:text-purple-600 md:w-5 md:h-5 transition-colors duration-200">
                      <path
                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[13px] md:text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                      Address Book
                    </span>
                  </div>
                  <span className="text-neutral-400 md:text-neutral-300 md:group-hover:text-purple-600 md:group-hover:translate-x-0.5 transition-all duration-200">›</span>
                </button>
                <button
                  onClick={() => navigate("/wishlist")}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-500 md:text-neutral-400 md:group-hover:text-purple-600 md:w-5 md:h-5 transition-colors duration-200">
                      <path
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[13px] md:text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                      Your Wishlist
                    </span>
                  </div>
                  <span className="text-neutral-400 md:text-neutral-300 md:group-hover:text-purple-600 md:group-hover:translate-x-0.5 transition-all duration-200">›</span>
                </button>

                <button
                  onClick={() => navigate("/support")}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 hover:bg-neutral-50 md:hover:bg-purple-50/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-500 md:text-neutral-400 md:group-hover:text-purple-600 md:w-5 md:h-5 transition-colors duration-200">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[13px] md:text-sm font-medium text-neutral-900 md:text-neutral-800 md:font-semibold">
                      Support
                    </span>
                  </div>
                  <span className="text-neutral-400 md:text-neutral-300 md:group-hover:text-purple-600 md:group-hover:translate-x-0.5 transition-all duration-200">›</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 hover:bg-neutral-50 md:hover:bg-red-50/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-red-500 md:w-5 md:h-5">
                      <path
                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="16 17 21 12 16 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="21"
                        y1="12"
                        x2="9"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-[13px] md:text-sm font-medium text-red-500 md:font-semibold">
                      Log Out
                    </span>
                  </div>
                  <span className="text-neutral-400 md:text-red-300 md:group-hover:text-red-500 md:group-hover:translate-x-0.5 transition-all duration-200">›</span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="px-4 md:px-0 py-2.5 md:py-0 mt-4 md:mt-6">
              <div className="bg-red-50/50 md:bg-red-50/20 rounded-lg md:rounded-2xl border border-red-200 md:border-red-100/80 overflow-hidden md:shadow-sm">
                <button
                  onClick={startDeleteFlow}
                  className="w-full flex items-center justify-between px-3 md:px-5 py-3.5 md:py-4 hover:bg-red-50/60 md:hover:bg-red-50/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-600 md:w-5 md:h-5">
                      <path
                        d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[13px] md:text-sm font-semibold text-red-600 md:font-bold">
                      Delete Account
                    </span>
                  </div>
                  <span className="text-red-400 md:text-red-300 md:group-hover:text-red-500 md:group-hover:translate-x-0.5 transition-transform duration-200">›</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showEditModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 md:inset-0 z-50 md:flex md:items-center md:justify-center md:p-4 animate-in slide-in-from-bottom md:zoom-in-95 duration-500 md:duration-300 ease-out">
            <div className="bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl max-w-lg mx-auto p-6 pt-12 md:pt-8 pb-32 md:pb-8 relative w-full overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-8 md:top-6 right-6 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors border-none cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="text-center">
                <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  Edit Profile
                </h3>
                <p className="text-[13px] text-neutral-500 mb-8 px-4">
                  Update your personal information to keep your profile current.
                </p>
                <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1 ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      placeholder="Enter Full Name"
                      className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1 ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      placeholder="Enter Email Address"
                      className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1 ml-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editData.dateOfBirth}
                      onChange={(e) => setEditData({...editData, dateOfBirth: e.target.value})}
                      className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full rounded-xl bg-white text-purple-600 border border-purple-600 font-bold py-3.5 hover:bg-purple-50 disabled:opacity-50 transition-all shadow-sm uppercase tracking-wider text-sm mt-6 cursor-pointer">
                    {updating ? "Updating..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}


      {deleteStep > 0 && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => { if (!deleting) setDeleteStep(0); }}
          />
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4">
            <div className="bg-white rounded-[24px] shadow-2xl max-w-[290px] sm:max-w-sm w-full p-4 pt-6 pb-4 sm:p-5 sm:pt-8 sm:pb-5 relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh]">
              {!deleting && (
                <button
                  onClick={() => setDeleteStep(0)}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors border-none cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Step 1: Warning Details */}
              {deleteStep === 1 && (
                <div className="text-center">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Delete Your Account?
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    Are you sure you want to delete your account? This action is permanent and cannot be undone. All your orders, saved addresses, and profile details will be cleared.
                  </p>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider">
                      Cancel
                    </button>
                    <button
                      onClick={handleSendDeleteOtp}
                      disabled={otpSending}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none">
                      {otpSending ? "Sending..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {deleteStep === 2 && (
                <div className="text-center">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Security Verification
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    We've generated a secure verification code to confirm ownership. Please enter the 4-digit code sent to your registered number.
                  </p>

                  <div className="max-w-xs mx-auto mb-4">
                    <input
                      type="text"
                      maxLength={4}
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • •"
                      className="w-full text-center tracking-[1.2em] font-mono text-lg rounded-xl border border-neutral-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all placeholder-neutral-300"
                    />
                    <p className="text-[10px] font-bold text-neutral-400 mt-2">
                      (Local Dev Mode Code: <span className="text-purple-600 font-extrabold">1234</span>)
                    </p>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider">
                      Back
                    </button>
                    <button
                      onClick={handleVerifyOtpAndNext}
                      className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-md shadow-purple-100 uppercase tracking-wider border-none">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Explicit Text Confirmation */}
              {deleteStep === 3 && (
                <form onSubmit={handleConfirmDelete} className="text-center">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Final Confirmation
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    To completely finalize the soft-deletion process, please type <strong className="text-red-600 uppercase font-extrabold">DELETE</strong> below.
                  </p>

                  <div className="max-w-xs mx-auto mb-4">
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="w-full text-center uppercase font-bold text-xs rounded-xl border border-neutral-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all placeholder-neutral-300"
                    />
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={deleting || deleteConfirmText !== "DELETE"}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none">
                      {deleting ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
