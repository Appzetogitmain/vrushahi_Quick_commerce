import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { updateSettings, getDeliveryProfile, getPolicies, sendDeleteOtp, deleteDeliveryAccount } from '../../../services/api/delivery/deliveryService';
import { useAuth } from '../../../context/AuthContext';

export default function DeliverySettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profile = await getDeliveryProfile();
        if (profile.settings) {
          setNotificationsEnabled(profile.settings.notifications ?? true);
          setLocationEnabled(profile.settings.location ?? true);
          setSoundEnabled(profile.settings.sound ?? true);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingChange = async (key: string, value: boolean) => {
    // Optimistic update
    if (key === 'notifications') setNotificationsEnabled(value);
    if (key === 'location') setLocationEnabled(value);
    if (key === 'sound') setSoundEnabled(value);

    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("Failed to update settings", error);
    }
  };

  const handleShowPolicy = (title: string) => {
    navigate(`/policy?type=delivery&title=${encodeURIComponent(title)}`);
  };

  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Receive notifications for new orders',
      value: notificationsEnabled,
      onChange: (val: boolean) => handleSettingChange('notifications', val),
    },
    {
      id: 'location',
      title: 'Location Services',
      description: 'Allow app to access your location',
      value: locationEnabled,
      onChange: (val: boolean) => handleSettingChange('location', val),
    },
    {
      id: 'sound',
      title: 'Sound Alerts',
      description: 'Play sound for new order alerts',
      value: soundEnabled,
      onChange: (val: boolean) => handleSettingChange('sound', val),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader hideProfile={true} hideToggle={true} />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Preferences</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {settingsOptions.map((option) => (
              <div key={option.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.title}</p>
                  <p className="text-neutral-500 text-xs">{option.description}</p>
                </div>
                <button
                  onClick={() => option.onChange(!option.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${option.value ? 'bg-orange-500' : 'bg-neutral-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${option.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Other</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="w-full p-4 flex items-center justify-between bg-white">
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Language</p>
                <p className="text-neutral-500 text-xs mt-1">English</p>
              </div>
            </div>
            <button 
              onClick={() => handleShowPolicy('Privacy Policy')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Privacy Policy</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button 
              onClick={() => handleShowPolicy('Terms & Conditions')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Terms & Conditions</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50/50 rounded-xl shadow-sm border border-red-200 overflow-hidden mt-4">
          <div className="p-4">
            <p className="text-neutral-500 text-xs mb-3 leading-relaxed">
              Deleting your account is permanent. This will clear your wallet balance, order history, vehicle registration, and profile details.
            </p>
            <button
              onClick={startDeleteFlow}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="mt-4 text-center">
          <p className="text-neutral-400 text-xs">App Version 1.0.0</p>
        </div>
      </div>
      <DeliveryBottomNav />

      {/* Removed Policy Modal */}

      {deleteStep > 0 && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!deleting) setDeleteStep(0); }}
          />
          <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4">
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

