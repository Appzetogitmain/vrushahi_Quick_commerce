import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/config";
import { useAuth } from "../../../context/AuthContext";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface CustomerNotificationBellProps {
  className?: string;
  iconColor?: string;
}

export default function CustomerNotificationBell({
  className = "",
  iconColor = "#000000",
}: CustomerNotificationBellProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!isAuthenticated || user?.userType !== "Customer") return;
    try {
      setLoading(true);
      const res = await api.get("/customer/notifications");
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch customer notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.userType === "Customer") {
      fetchNotifications();

      const handleNotificationReceived = () => {
        fetchNotifications();
      };

      window.addEventListener("vrushahi_notification_received", handleNotificationReceived);

      // Listen for socket events if socket connection exists
      return () => {
        window.removeEventListener("vrushahi_notification_received", handleNotificationReceived);
      };
    }
  }, [isAuthenticated, user?.userType, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
    if (!open) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/customer/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/customer/notifications/mark-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.link) navigate(notification.link);
    setOpen(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Order": return "🛍️";
      case "Payment": return "💳";
      case "Success": return "✅";
      case "Warning": return "⚠️";
      case "Error": return "❌";
      case "System": return "⚙️";
      default: return "🔔";
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!isAuthenticated || user?.userType !== "Customer") return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className={`p-2 rounded-full transition-all relative group active:scale-90 ${className}`}
        title="Notifications"
        id="customer-notification-bell"
      >
        {/* Bell Icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-200 ${open ? "scale-90" : "group-hover:scale-110"}`}
        >
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#ff3269] text-white text-[10px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5 border-2 border-white shadow-sm ring-1 ring-pink-100">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Full Screen Modal */}
      {open && createPortal(
        <div
          className="fixed inset-0 bg-white z-[9999] flex flex-col overflow-hidden"
          style={{
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-sm bg-[#ff3269] text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors"
                >
                  Mark all read
                </button>
              )}
              {/* Close Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="p-1.5 rounded-full hover:bg-gray-200/60 transition-colors bg-white/50"
                aria-label="Close notifications"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                <span className="text-5xl mb-4">🔔</span>
                <span className="text-lg font-medium text-gray-600">No notifications yet</span>
                <p className="text-sm text-gray-400 mt-2">When you get notifications, they'll show up here</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-4 px-4 py-4 cursor-pointer hover:bg-white transition-colors border-b border-gray-100 ${
                    !notification.isRead ? "bg-purple-50/40" : "bg-transparent"
                  }`}
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5 bg-white w-10 h-10 flex items-center justify-center rounded-full shadow-sm border border-gray-50">
                    {getTypeIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-base font-semibold truncate ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2.5 h-2.5 bg-[#ff3269] rounded-full flex-shrink-0 mt-1.5 shadow-sm" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-4 text-center">
                <span className="text-xs text-gray-400 font-medium">
                  Showing last {notifications.length} notifications
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
