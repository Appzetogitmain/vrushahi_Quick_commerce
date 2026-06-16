import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { useAuth } from '../../../context/AuthContext';
import { sendDeleteOtp, deleteDeliveryAccount } from '../../../services/api/delivery/deliveryService';

export default function DeliveryMenu() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { id: 'menu-1', title: 'Profile', route: '/delivery/profile' },
    { id: 'menu-wallet', title: 'Wallet & Payouts', route: '/delivery/wallet' },
    { id: 'menu-3', title: 'Settings', route: '/delivery/settings' },
    { id: 'menu-4', title: 'Help & Support', route: '/delivery/support' },
    { id: 'menu-5', title: 'About', route: '/delivery/about' },
    { id: 'menu-6', title: 'Logout', route: '/delivery/login' },
    { id: 'menu-delete', title: 'Delete Account', route: 'delete' },
  ];

  const getMenuIcon = (menuId: string) => {
    switch (menuId) {
      case 'menu-1': // Profile
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        );

      case 'menu-wallet': // Wallet & Payouts
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'menu-3': // Settings
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        );
      case 'menu-4': // Help & Support
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path
              d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        );
      case 'menu-5': // About
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path
              d="M12 16V12M12 8H12.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        );
      case 'menu-6': // Logout
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M16 17L21 12L16 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M21 12H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        );
      case 'menu-delete': // Delete Account
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Delete Account States & Flow
  const [deleteStep, setDeleteStep] = useState(0); // 0 = Closed, 1 = Warning, 2 = OTP Re-Auth, 3 = Confirmation Text
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const startDeleteFlow = () => {
    setDeleteStep(1);
    setDeleteOtp('');
    setDeleteConfirmText('');
  };

  const handleSendDeleteOtp = async () => {
    try {
      setOtpSending(true);
      const res = await sendDeleteOtp();
      if (res.success) {
        alert(res.message || 'OTP sent successfully to registered number');
        setDeleteStep(2);
      } else {
        alert(res.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtpAndNext = () => {
    if (!deleteOtp || !/^[0-9]{4}$/.test(deleteOtp)) {
      alert('Please enter a valid 4-digit verification OTP');
      return;
    }
    setDeleteStep(3);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    try {
      setDeleting(true);
      const res = await deleteDeliveryAccount({ otp: deleteOtp, confirmText: 'DELETE' });
      if (res.success) {
        alert('Your delivery account has been deleted successfully');
        setDeleteStep(0);
        logout();
        navigate('/delivery/login');
      } else {
        alert(res.message || 'Deletion failed');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Deletion failed';
      alert(errMsg);
      if (errMsg.toLowerCase().includes('otp')) {
        setDeleteStep(2); // Send back to OTP step if OTP is invalid
      }
    } finally {
      setDeleting(false);
    }
  };

  // Lock background scroll when Delete Modal is active
  useEffect(() => {
    if (deleteStep > 0) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [deleteStep]);

  const handleMenuClick = (route: string) => {
    if (route === '/delivery/login') {
      setShowLogoutModal(true);
    } else if (route === 'delete') {
      startDeleteFlow();
    } else {
      navigate(route);
    }
  };

  const confirmLogout = () => {
    logout();
    navigate('/delivery/login');
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader hideProfile={true} />
      <div className="px-4 py-4">
        <h2 className="text-neutral-900 text-xl font-semibold mb-4">Menu</h2>
        {menuItems.length > 0 ? (
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.route)}
                className={`w-full bg-white rounded-xl p-4 shadow-sm border border-neutral-200 flex items-center gap-3 hover:shadow-md transition-shadow ${
                  item.id === 'menu-6' ? 'text-red-600 hover:bg-red-50' : 
                  item.id === 'menu-delete' ? 'text-red-700 hover:bg-red-50' : 'hover:bg-neutral-50'
                }`}
              >
                <span className={`flex-shrink-0 ${item.id === 'menu-6' || item.id === 'menu-delete' ? 'text-red-600' : 'text-neutral-600'}`}>
                  {getMenuIcon(item.id)}
                </span>
                <span
                  className={`text-sm font-medium flex-1 text-left ${
                    item.id === 'menu-6' || item.id === 'menu-delete' ? 'text-red-600' : 'text-neutral-900'
                  }`}
                >
                  {item.title}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={item.id === 'menu-6' || item.id === 'menu-delete' ? 'text-red-600' : 'text-neutral-400'}
                >
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 min-h-[400px] flex items-center justify-center shadow-sm border border-neutral-200">
            <p className="text-neutral-500 text-sm">Menu options coming soon</p>
          </div>
        )}
      </div>
      <DeliveryBottomNav />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 17L21 12L16 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Log Out?</h3>
              <p className="text-neutral-500 text-sm">
                Are you sure you want to log out of your account? You will need to login again to accept orders.
              </p>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteStep > 0 && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!deleting) setDeleteStep(0); }}
          />
          <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[24px] shadow-2xl max-w-[290px] sm:max-w-sm w-full p-4 pt-6 pb-4 sm:p-5 sm:pt-8 sm:pb-5 relative overflow-y-auto max-h-[85vh]">
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
                <div className="text-center animate-fadeIn">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Delete Rider Account?
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    Are you sure you want to delete your delivery account? This action is permanent and cannot be undone. All your wallet history, completed runs, and profile details will be cleared.
                  </p>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendDeleteOtp}
                      disabled={otpSending}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none cursor-pointer">
                      {otpSending ? "Sending..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {deleteStep === 2 && (
                <div className="text-center animate-fadeIn">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Security Verification
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    We've generated a secure verification code to confirm rider ownership. Please enter the 4-digit code sent to your registered number.
                  </p>

                  <div className="max-w-xs mx-auto mb-4">
                    <input
                      type="text"
                      maxLength={4}
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • •"
                      className="w-full text-center tracking-[1.2em] font-mono text-lg rounded-xl border border-neutral-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-600/10 focus:border-orange-600 transition-all placeholder-neutral-300"
                    />
                    <p className="text-[10px] font-bold text-neutral-400 mt-2">
                      (Local Dev Mode Code: <span className="text-orange-600 font-extrabold">1234</span>)
                    </p>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtpAndNext}
                      className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all shadow-md shadow-orange-100 uppercase tracking-wider border-none cursor-pointer">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Explicit Text Confirmation */}
              {deleteStep === 3 && (
                <form onSubmit={handleConfirmDelete} className="text-center animate-fadeIn">
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
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={deleting || deleteConfirmText !== "DELETE"}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none cursor-pointer">
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
