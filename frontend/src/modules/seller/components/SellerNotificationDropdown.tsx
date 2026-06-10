import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getSellerNotifications,
  markNotificationAsRead,
  markMultipleAsRead,
  Notification,
} from "../../../services/api/seller/sellerNotificationService";

export default function SellerNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
    // Fetch notifications periodically (e.g., every 1 minute)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await getSellerNotifications();
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch seller notifications:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }
    // Navigate if there's a link
    if (notification.link) {
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
    if (unreadIds.length === 0) return;

    try {
      await markMultipleAsRead(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-teal-600 bg-white rounded-full px-1 shadow-sm transform translate-x-1 -translate-y-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute -right-8 sm:right-0 mt-2 w-[300px] sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-100 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
            <h3 className="font-bold text-neutral-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <svg
                  className="mx-auto h-12 w-12 text-neutral-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1">When you get notifications, they'll show up here</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {notifications.map((notification) => (
                  <li key={notification._id}>
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className={`block p-4 hover:bg-neutral-50 transition-colors ${
                          !notification.isRead ? "bg-teal-50/30" : ""
                        }`}
                      >
                        <NotificationContent notification={notification} formatTimeAgo={formatTimeAgo} />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors ${
                          !notification.isRead ? "bg-teal-50/30" : ""
                        }`}
                      >
                        <NotificationContent notification={notification} formatTimeAgo={formatTimeAgo} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-neutral-100 bg-neutral-50 shrink-0 text-center">
               <span className="text-xs text-neutral-500">Showing recent notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for notification content
function NotificationContent({
  notification,
  formatTimeAgo,
}: {
  notification: Notification;
  formatTimeAgo: (date: string) => string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-1">
        {!notification.isRead ? (
          <span className="h-2 w-2 bg-teal-500 rounded-full inline-block"></span>
        ) : (
          <span className="h-2 w-2 bg-transparent inline-block"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            !notification.isRead
              ? "font-semibold text-neutral-900"
              : "font-medium text-neutral-700"
          }`}
        >
          {notification.title}
        </p>
        <p
          className={`text-sm mt-1 line-clamp-2 ${
            !notification.isRead ? "text-neutral-700" : "text-neutral-500"
          }`}
        >
          {notification.message}
        </p>
        <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <circle cx="12" cy="12" r="10"></circle>
             <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
