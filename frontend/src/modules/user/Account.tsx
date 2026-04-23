import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  CustomerProfile,
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
      <div className="pb-24 md:pb-8 bg-white min-h-screen font-sans">
      <div className="bg-[#f0e6f7] border-b border-neutral-100 pb-3 md:pb-4 pt-4 md:pt-6 text-neutral-900">
          <div className="px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => navigate(-1)}
                className="text-neutral-900 hover:bg-black/5 p-1 rounded-full transition-colors"
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
              {/* Removed from here to move to menu options */}
            </div>
            <div className="flex flex-col items-center mb-2 md:mb-3">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/40 flex items-center justify-center mb-1.5 md:mb-1.5 border-2 border-white/60 shadow-sm backdrop-blur-sm">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-neutral-900 md:w-10 md:h-10">

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
              <h1 className="text-lg md:text-xl font-bold text-neutral-900 mb-0.5">
                Welcome!
              </h1>
              <p className="text-xs md:text-sm text-neutral-600 font-medium text-center px-4">
                Login to access your profile, orders, and more
              </p>
            </div>
          </div>
        </div>


        <div className="px-4 md:px-6 lg:px-8 mt-6">
          <div className="max-w-md mx-auto">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 rounded-xl font-bold text-base bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 uppercase tracking-wide border-none">
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
    <div className="pb-24 md:pb-8 bg-white min-h-screen font-sans">
      <div className="bg-[#f0e6f7] border-b border-neutral-100 pb-3 md:pb-4 pt-4 md:pt-6 text-neutral-900">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => navigate(-1)}
              className="text-neutral-900 hover:bg-black/5 p-1 rounded-full transition-colors"
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
              className="p-1 rounded-full hover:bg-black/5 transition-colors text-purple-600"
              aria-label="Edit Profile"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col items-center mb-2 md:mb-3">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/40 flex items-center justify-center mb-1.5 md:mb-1.5 border-2 border-white/60 shadow-sm backdrop-blur-sm">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-neutral-900 md:w-10 md:h-10">

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
            <h1 className="text-lg md:text-xl font-bold text-neutral-900 mb-0.5">
              {displayName}
            </h1>

            <div className="flex flex-col items-center gap-1 md:gap-1 text-[10px] md:text-xs text-neutral-600 font-bold">

              {displayPhone && (
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{displayPhone}</span>
                </div>
              )}
              {displayDateOfBirth && (
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                  <span>{formatDate(displayDateOfBirth)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      <div className="px-4 md:px-6 lg:px-8 -mt-4 md:-mt-6 mb-4 md:mb-6">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 md:gap-6 max-w-2xl md:mx-auto">
          <button
            onClick={() => navigate("/orders")}
            className="bg-white rounded-lg border border-neutral-200 p-3 md:p-4 hover:shadow-md transition-shadow text-center outline-none">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-1.5 md:mb-2 text-neutral-700 md:w-6 md:h-6">
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
              />
              <path
                d="M16 10a4 4 0 0 1-8 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-[10px] md:text-xs font-semibold text-neutral-900">
              Your orders
            </div>
          </button>
          <button
            onClick={() => navigate("/faq")}
            className="bg-white rounded-lg border border-neutral-200 p-3 md:p-4 hover:shadow-md transition-shadow text-center outline-none">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-1.5 md:mb-2 text-neutral-700 md:w-6 md:h-6">
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-[10px] md:text-xs font-semibold text-neutral-900">
              Need help?
            </div>
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5">
        <h2 className="text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wide">
          Your information
        </h2>
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
          <button
            onClick={() => navigate("/cart")}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[13px] font-medium text-neutral-900">
                My Cart
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
          <button
            onClick={() => navigate("/address-book")}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-neutral-500">
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
              <span className="text-[13px] font-medium text-neutral-900">
                Address Book
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
          <button
            onClick={() => navigate("/wishlist")}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-neutral-500">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[13px] font-medium text-neutral-900">
                Your Wishlist
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>

          <button
            onClick={() => (window.location.href = "https://about.vrushahi.com")}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-neutral-500">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="12"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12.01"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span className="text-[13px] font-medium text-neutral-900">
                About Us
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
          <button
            onClick={() => navigate("/policy?type=customer")}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[13px] font-medium text-neutral-900">
                Privacy Policy
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-red-500">
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
              <span className="text-[13px] font-medium text-red-500">
                Log Out
              </span>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
        </div>
      </div>



      {showEditModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg mx-auto p-6 pt-12 pb-32 relative">
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-8 right-6 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors">
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
                    className="w-full rounded-xl bg-white text-purple-600 border border-purple-600 font-bold py-3.5 hover:bg-purple-50 disabled:opacity-50 transition-all shadow-sm uppercase tracking-wider text-sm mt-6">
                    {updating ? "Updating..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
