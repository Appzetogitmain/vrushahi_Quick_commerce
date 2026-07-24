import { useDeliveryStatus } from '../context/DeliveryStatusContext';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationRead } from '../../../services/api/delivery/deliveryService';
import vrushahiLogo from '@assets/logo.png';

interface DeliveryHeaderProps {
  userName?: string;
  hideProfile?: boolean;
  hideToggle?: boolean;
}

export default function DeliveryHeader({ userName, hideProfile, hideToggle }: DeliveryHeaderProps) {
  const { isOnline, setIsOnline } = useDeliveryStatus();
  const { userName: contextUserName } = useDeliveryUser();
  const navigate = useNavigate();
  const displayName = userName || contextUserName;

  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

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
        const response: any = await getNotifications();
        if (response.success && response.data) {
          // Just take the first 10 for display
          const fetchedNotifs = response.data.slice(0, 10);
          setNotifications(fetchedNotifs);
          
          // Check for new unread notifications to trigger push notifications
          if ("Notification" in window && Notification.permission === "granted") {
            fetchedNotifs.forEach((notif: any) => {
              if (!notif.isRead && !notifiedIdsRef.current.has(notif._id)) {
                // Show native push notification
                new window.Notification("Vrushahi Delivery: " + notif.title, {
                  body: notif.message,
                  icon: vrushahiLogo
                });
                notifiedIdsRef.current.add(notif._id);
              }
            });
          } else {
             // Track them so we don't spam later
             fetchedNotifs.forEach((notif: any) => {
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="bg-white shadow-sm">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="px-4 py-2 bg-neutral-500 text-white text-xs font-medium text-center">
          Offline
        </div>
      )}
      
      {/* Header Content */}
      <div className="px-4 py-3">
        {/* App Title */}
        <h1 className={`text-xl font-extrabold text-center mb-3 transition-colors tracking-tight ${
          isOnline ? 'text-[#118B50]' : 'text-neutral-500'
        }`}>
          Vrumarket Delivery
        </h1>
        
        {/* User Info Bar */}
        <div className={`flex items-center ${
          hideProfile && hideToggle ? 'justify-center' : 
          hideProfile ? 'justify-end' : 
          hideToggle ? 'justify-start' : 
          'justify-between'
        }`}>
          {!hideProfile && (
            <div className="flex items-center gap-4">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/delivery/profile')}
              >
                {/* Profile Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isOnline ? 'bg-green-600' : 'bg-neutral-400'
                }`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" fill="none"/>
                    <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-neutral-700 text-sm">Hello</span>
                  <span className="text-neutral-900 text-xs font-medium">{displayName}</span>
                </div>
              </div>


            </div>
          )}
          
          {/* Toggle Switch */}
          {!hideToggle && (
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isOnline ? 'bg-green-600' : 'bg-neutral-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isOnline ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




