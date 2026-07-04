import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications, type Notification, markMultipleAsRead } from "../../../services/api/admin/adminNotificationService";
import vrushahiLogo from "@assets/LogoLatest.png";

interface AdminHeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export default function AdminHeader({
  onMenuClick,
  isSidebarOpen,
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const isActive = (path: string) => location.pathname.includes(path);

  useEffect(() => {
    // Request push notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotificationsDropdown(false);
      }
    };

    const fetchRecentNotifications = async () => {
      try {
        const response = await getNotifications({ limit: 10 });
        if (response.success && response.data) {
          const fetchedNotifs = response.data;
          setNotifications(fetchedNotifs);
          
          // Check for new unread notifications to trigger push notifications
          if ("Notification" in window && Notification.permission === "granted") {
            fetchedNotifs.forEach(notif => {
              if (!notif.isRead && !notifiedIdsRef.current.has(notif._id)) {
                // Show native push notification
                new window.Notification("Vrushahi Admin: " + notif.title, {
                  body: notif.message,
                  icon: vrushahiLogo
                });
                notifiedIdsRef.current.add(notif._id);
              }
            });
          } else {
             // Just track them so we don't spam if permission is granted later
             fetchedNotifs.forEach(notif => {
               if (!notif.isRead) notifiedIdsRef.current.add(notif._id);
             });
          }
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    fetchRecentNotifications();
    
    // Poll every 3 seconds for instant updates
    const interval = setInterval(fetchRecentNotifications, 3000);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const handleLogoClick = () => {
    navigate("/admin");
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-30">
      <div className="flex flex-row items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {/* Logo and Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors flex-shrink-0"
            aria-label="Toggle menu">
            {isSidebarOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 6H20M4 12H20M4 18H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          {/* Kosil Logo */}
          <button
            onClick={handleLogoClick}
            className="">
            <img
              src={vrushahiLogo}
              alt="vrushahi"
              className="h-10 sm:h-12 w-auto object-contain cursor-pointer"
              style={{ maxWidth: "200px" }}
            />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <button
            onClick={() => navigate("/admin/orders")}
            className={`relative px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
              isActive("/admin/orders")
                ? "text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900"
            }`}>
            Orders
          </button>
          <button
            onClick={() => navigate("/admin/customers")}
            className={`px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isActive("/admin/customers")
                ? "text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900"
            }`}>
            Manage Customer
          </button>
          <button
            onClick={() => navigate("/admin/collect-cash")}
            className={`px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isActive("/admin/collect-cash")
                ? "text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900"
            }`}>
            Collect Cash
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 md:gap-4 relative">

          {/* Notifications Button */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                const isOpening = !showNotificationsDropdown;
                setShowNotificationsDropdown(isOpening);
                if (isOpening && unreadCount > 0) {
                  const unreadIds = notifications.filter(n => !n.isRead).map((n) => n._id);
                  markMultipleAsRead({ notificationIds: unreadIds }).catch(console.error);
                  // Optimistically mark them read locally
                  setNotifications(prev => prev.map(n => unreadIds.includes(n._id) ? { ...n, isRead: true } : n));
                }
              }}
              className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors relative"
              aria-label="Notifications">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 8A6 6 0 0 0 6 8C6 11.3137 4 14 4 17H20C20 14 18 11.3137 18 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 max-h-96 flex flex-col">
                <div className="px-4 py-2 border-b border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Notifications
                  </h3>
                </div>
                <div className="overflow-y-auto flex-1 max-h-64 divide-y divide-neutral-100">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif._id} className={`p-3 text-sm ${!notif.isRead ? 'bg-teal-50/50' : 'bg-white'}`}>
                        <div className="font-semibold text-neutral-800 mb-1">{notif.title}</div>
                        <div className="text-neutral-600 line-clamp-2">{notif.message}</div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {new Date(notif.createdAt || '').toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 px-4 text-center text-sm text-neutral-500">
                      <p>No notifications</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
                  <button
                    onClick={() => {
                      navigate("/admin/notification");
                      setShowNotificationsDropdown(false);
                    }}
                    className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <button
            onClick={() => navigate("/admin/profile")}
            className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label="Profile">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label="Logout">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <h3 className="text-lg font-semibold text-neutral-900">Confirm Logout</h3>
            </div>
            <div className="p-6">
              <p className="text-neutral-600">Are you sure you want to log out of your session?</p>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3 bg-neutral-50">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
