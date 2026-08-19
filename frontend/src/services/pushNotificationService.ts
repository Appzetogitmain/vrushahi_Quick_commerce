import { messaging, getToken, onMessage } from '../firebase';
import api from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "dummy-vapid-key";

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Unregister existing workers to ensure fresh update if needed
            // const registrations = await navigator.serviceWorker.getRegistrations();
            // for(let registration of registrations) {
            //     registration.unregister();
            // }

            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            console.log('✅ Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            // Don't throw to avoid crashing app on non-supported envs
            return null;
        }
    } else {
        console.warn('Service Workers are not supported');
        return null;
    }
}

// Request notification permission
export async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Notification permission granted');
            return true;
        } else {
            console.log('❌ Notification permission denied');
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                alert('⚠️ Notification permission DENIED. You must enable notifications in your browser settings to receive orders.');
            }
            return false;
        }
    }
    return false;
}

// Get FCM token
export async function getFCMToken() {
    if (!messaging) return null;

    try {
        const registration = await registerServiceWorker();
        if (!registration) {
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                alert('❌ Service Worker registration failed. FCM will not work on this mobile device.');
            }
            return null; // Failed or not supported
        }

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        if (!window.isSecureContext && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            alert('❌ Not a Secure Context (HTTPS missing). FCM will not work on this mobile browser.');
        }

        console.log('DEBUG: Using VAPID Key:', VAPID_KEY);

        try {
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log('✅ FCM Token obtained:', token);
                return token;
            } else {
                console.log('❌ No FCM token available');
                return null;
            }
        } catch (tokenError: any) {
            console.error('❌ Error calling getToken:', tokenError);
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                alert(`❌ getToken failed: ${tokenError.message || 'Unknown error'}`);
            }
            if (tokenError.code === 'messaging/token-subscribe-failed' || tokenError.message?.includes('Missing required authentication credential')) {
                console.error(`👉 POTENTIAL FIX: Check your Google Cloud Console API Key restrictions. ` +
                    `Ensure "${window.location.origin}" (and with trailing slash) is allowed in HTTP Referrers.`);
            }
            throw tokenError;
        }

    } catch (error) {
        console.error('❌ Error getting FCM token (outer):', error);
        return null;
    }
}

// Global interface for Flutter or native wrapper injection
if (typeof window !== 'undefined') {
    (window as any).registerNativeFCMToken = async (nativeToken: string) => {
        console.log('📱 Native FCM token received from Flutter wrapper:', nativeToken);
        if (!nativeToken) return;
        try {
            localStorage.setItem('fcm_token_native', nativeToken);
            const rawUser = localStorage.getItem('userData');
            const userId = rawUser ? JSON.parse(rawUser).id : null;
            await api.post('/fcm-tokens/save', {
                token: nativeToken,
                platform: 'mobile',
                userId: userId,
            });
            console.log('✅ Native FCM token registered successfully with backend');
        } catch (err) {
            console.error('❌ Failed to register native FCM token with backend:', err);
        }
    };
}

// Register FCM token with backend
export async function registerFCMToken(forceUpdate = false) {
    try {
        const currentUserId = (() => {
            try {
                const raw = localStorage.getItem('userData');
                return raw ? JSON.parse(raw).id : null;
            } catch {
                return null;
            }
        })();

        // Check if a native token was provided by Flutter wrapper
        const nativeToken =
            (window as any).flutterFCMToken ||
            localStorage.getItem('flutter_fcm_token') ||
            localStorage.getItem('fcm_token_native');

        if (nativeToken) {
            console.log('📱 Registering native Flutter FCM token with backend...');
            try {
                const response = await api.post(`/fcm-tokens/save`, {
                    token: nativeToken,
                    platform: 'mobile',
                    userId: currentUserId,
                });
                if (response.data.success) {
                    console.log('✅ Native Flutter FCM token registered with backend');
                    return nativeToken;
                }
            } catch (nativeErr) {
                console.error('Error saving native FCM token:', nativeErr);
            }
        }

        if (!messaging) {
            console.log('Messaging not available or not supported on this client');
            return null;
        }

        const savedToken = localStorage.getItem('fcm_token_web');
        const savedForUser = localStorage.getItem('fcm_token_web_user');
        if (savedToken && savedForUser === currentUserId && !forceUpdate) {
            console.log('FCM token already registered locally for this user');
            return savedToken;
        }

        // Request permission first
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('Notification permission not granted, skipping token registration');
            return null;
        }

        // Get token
        const token = await getFCMToken();
        if (!token) {
            console.warn('Failed to get FCM token, skipping backend registration');
            return null;
        }

        if (token === savedToken && savedForUser === currentUserId) {
            return token;
        }

        // Detect platform
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const platform = isMobile ? 'mobile' : 'web';

        // Save to backend
        try {
            console.log(`Attempting to save FCM token to backend for ${platform}...`);
            const response = await api.post(`/fcm-tokens/save`, {
                token: token,
                platform: platform,
                userId: currentUserId,
            });

            if (response.data.success) {
                localStorage.setItem('fcm_token_web', token);
                localStorage.setItem('fcm_token_web_user', currentUserId || '');
                console.log(`✅ FCM token registered with backend as ${platform}`);
                return token;
            }
        } catch (apiError: any) {
            console.error('Failed to register token with backend API:', apiError);
        }

        return token;
    } catch (error: any) {
        console.error('❌ Error in registerFCMToken flow:', error);
        return null;
    }
}

// Unregister FCM token from backend
export async function unregisterFCMToken() {
    try {
        const token = localStorage.getItem('fcm_token_web');
        if (!token) return;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const platform = isMobile ? 'mobile' : 'web';

        const response = await api.delete('/fcm-tokens/remove', {
            data: { token, platform }
        });

        if (response.data.success) {
            console.log(`✅ FCM token unregistered from backend`);
            localStorage.removeItem('fcm_token_web');
        }
    } catch (error) {
        console.error('❌ Error unregistering FCM token:', error);
    }
}

// Setup foreground notification handler
export function setupForegroundNotificationHandler(handler?: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        // Broadcast custom event so UI components (like CustomerNotificationBell) refresh unread notifications
        try {
            window.dispatchEvent(new CustomEvent('vrushahi_notification_received', { detail: payload }));
        } catch (evtErr) {
            console.warn('Error dispatching notification event:', evtErr);
        }

        // Call custom handler if provided
        if (handler) {
            handler(payload);
        }

        // Show a system notification even in foreground
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'vrushahi Notification';
            const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';

            const notificationOptions = {
                body: body,
                icon: '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.notificationId || payload.data?.type || 'vrushahi-general',
                data: payload.data || {}
            };

            // Android Chrome blocks new Notification() constructor directly in window context,
            // so we always use ServiceWorkerRegistration.showNotification() when available
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready
                    .then((registration) => {
                        registration.showNotification(title, notificationOptions);
                    })
                    .catch((swErr) => {
                        try {
                            new Notification(title, notificationOptions);
                        } catch (notifErr) {
                            console.warn('Could not display foreground notification:', notifErr);
                        }
                    });
            } else {
                try {
                    new Notification(title, notificationOptions);
                } catch (notifErr) {
                    console.warn('Could not display foreground notification:', notifErr);
                }
            }
        }
    });
}

// Initialize push notifications
export async function initializePushNotifications() {
    // Basic compatibility check
    if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
        console.warn('⚠️ Push notifications are not supported in this browser environment.');
        return;
    }

    // Secure context check (required for Service Workers and Notifications)
    if (!window.isSecureContext) {
        console.error('❌ Push notifications require a Secure Context (HTTPS or localhost). ' +
            'If you are testing on a mobile device via IP, please use a secure tunnel (like ngrok) or deploy to a staging server.');
        return;
    }

    try {
        // Just register service worker on init to be ready
        await registerServiceWorker();
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}
