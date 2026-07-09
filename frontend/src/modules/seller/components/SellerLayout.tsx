import { ReactNode, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SellerHeader from './SellerHeader';
import SellerSidebar from './SellerSidebar';
import { useSellerSocket, SellerNotification } from '../hooks/useSellerSocket';
import SellerNotificationAlert from './SellerNotificationAlert';
import { useAuth } from '../../../context/AuthContext';
import { getSellerProfile } from '../../../services/api/auth/sellerAuthService';
import { acknowledgeSubscriptionExpiry } from '../../../services/api/subscription/sellerSubscriptionService';
import { useToast } from '../../../context/ToastContext';

interface SellerLayoutProps {
  children: ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<SellerNotification | null>(null);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReasonMsg, setBlockReasonMsg] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [expiryAcknowledging, setExpiryAcknowledging] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const handleSellerDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      setDeletedMessage(customEvent.detail?.message || "Your seller account has been deleted by Vrushahi Platform.");
      setShowDeletedModal(true);
    };

    const handleSellerBlocked = (event: Event) => {
      const customEvent = event as CustomEvent;
      setBlockReasonMsg(customEvent.detail?.reason || "");
      setSupportEmail(customEvent.detail?.supportEmail || "");
      setSupportPhone(customEvent.detail?.supportPhone || "");
      setIsBlocked(true);
    };

    const handleSellerUnblocked = () => {
      setIsBlocked(false);
      setBlockReasonMsg("");
    };

    window.addEventListener('seller-deleted', handleSellerDeleted);
    window.addEventListener('seller-blocked', handleSellerBlocked);
    window.addEventListener('seller-unblocked', handleSellerUnblocked);
    
    return () => {
      window.removeEventListener('seller-deleted', handleSellerDeleted);
      window.removeEventListener('seller-blocked', handleSellerBlocked);
      window.removeEventListener('seller-unblocked', handleSellerUnblocked);
    };
  }, [logout]);

  useEffect(() => {
    const checkProfileStatus = async () => {
      try {
        const response = await getSellerProfile();
        if (response?.data?.status === 'Blocked') {
          setIsBlocked(true);
          setBlockReasonMsg(response.data.blockReason || "");
        }
        if (response?.data?.subscriptionStatus === 'Expired') {
          setShowExpiryPopup(true);
        }
      } catch (error) {
        console.error("Failed to check seller profile status:", error);
      }
    };
    checkProfileStatus();
  }, []);

  const handleNotificationReceived = useCallback((notification: SellerNotification) => {
    setActiveNotification(notification);
  }, []);

  useSellerSocket(handleNotificationReceived);

  // Global scroll lock for all modals in Seller Panel
  useEffect(() => {
    const checkModals = () => {
      const overlays = document.querySelectorAll('.fixed.inset-0');
      let isModalVisible = false;
      
      overlays.forEach(overlay => {
        // Skip mobile sidebar overlay
        if (overlay.classList.contains('lg:hidden') && window.innerWidth >= 1024) {
          return;
        }
        
        const style = window.getComputedStyle(overlay);
        if (style.display !== 'none') {
          if (overlay.className.includes('bg-') || overlay.className.includes('z-')) {
            isModalVisible = true;
          }
        }
      });

      const mainElement = document.querySelector('main');
      if (isModalVisible) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (mainElement) {
          mainElement.style.overflow = 'hidden';
        }
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        if (mainElement) {
          mainElement.style.overflow = '';
        }
      }
    };

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class', 'style'] 
    });

    window.addEventListener('resize', checkModals);
    checkModals();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkModals);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      const localMain = document.querySelector('main');
      if (localMain) {
        localMain.style.overflow = '';
      }
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeNotification = () => {
    setActiveNotification(null);
  };

  const handleDeletedModalClose = () => {
    setShowDeletedModal(false);
    logout();
  };

  const handleAcknowledgeExpiry = async () => {
    setExpiryAcknowledging(true);
    try {
      const res = await acknowledgeSubscriptionExpiry();
      if (res.success) {
        setShowExpiryPopup(false);
        showToast("Switched to commission model successfully.", "success");
      } else {
        showToast("Failed to acknowledge expiry.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error processing request.", "error");
    } finally {
      setExpiryAcknowledging(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-neutral-50 overflow-hidden">
      {/* Account Deleted Modal */}
      {showDeletedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Account Deleted</h3>
              <p className="text-sm text-gray-500 mb-6">
                {deletedMessage}
              </p>
              <button
                onClick={handleDeletedModalClose}
                className="w-full inline-flex justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Expiry Popup */}
      {showExpiryPopup && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Subscription Expired</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your subscription has expired. Want to continue with a subscription plan to enjoy 0% commission, or go ahead with the commission-based model?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowExpiryPopup(false);
                    navigate('/seller/subscription');
                  }}
                  className="w-full inline-flex justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors"
                >
                  Select Plan
                </button>
                <button
                  onClick={handleAcknowledgeExpiry}
                  disabled={expiryAcknowledging}
                  className="w-full inline-flex justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {expiryAcknowledging ? 'Processing...' : 'Go ahead with Commission Based'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Account Full-Screen Overlay */}
      {isBlocked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden border border-red-100">
            <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">Account Blocked</h2>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 text-center mb-6">
                Your seller account has been blocked by Vrushahi Platform and you can no longer access your dashboard.
              </p>
              
              {blockReasonMsg && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-orange-800 mb-1">Reason provided:</h4>
                  <p className="text-orange-900">{blockReasonMsg}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Need help? Contact Support:</h4>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>{supportEmail || "support@vrushahi.com"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>{supportPhone || "+91 9999999999"}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-center bg-gray-50 rounded-b-xl">
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Notification Alert */}
      <SellerNotificationAlert
        notification={activeNotification}
        onClose={closeNotification}
      />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Fixed */}
      <div
        className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SellerSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 w-full ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Header */}
        <SellerHeader onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-neutral-50">{children}</main>
      </div>
    </div>
  );
}

