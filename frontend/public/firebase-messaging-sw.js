// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBcntJlj2cwVLTLI9Y9bInDTYWeJ4-xMIs",
    authDomain: "vrumarket-da491.firebaseapp.com",
    projectId: "vrumarket-da491",
    storageBucket: "vrumarket-da491.firebasestorage.app",
    messagingSenderId: "593734915022",
    appId: "1:593734915022:web:fe3ba57bf60b0fe486119f",
    measurementId: "G-YNJEV5DPTF"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (err) {
    console.error('[firebase-messaging-sw.js] Firebase init error:', err);
}

// Initialize messaging
let messaging;
try {
    messaging = firebase.messaging();
} catch (err) {
    console.error('[firebase-messaging-sw.js] Failed to initialize messaging in SW:', err);
}

if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message: ', payload);

        const notificationTitle = payload.notification?.title || payload.data?.title || 'vrushahi Notification';
        const notificationBody = payload.notification?.body || payload.data?.body || payload.data?.message || '';

        const notificationOptions = {
            body: notificationBody,
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: payload.data?.notificationId || payload.data?.type || 'vrushahi-notification',
            data: payload.data || {},
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 200]
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Fallback push event listener for raw WebPush payloads
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        console.log('[firebase-messaging-sw.js] Fallback push event received:', payload);

        // If Firebase already handled it via onBackgroundMessage or notification block, don't duplicate
        const notificationTitle = payload.notification?.title || payload.data?.title;
        const notificationBody = payload.notification?.body || payload.data?.body || payload.data?.message;

        if (notificationTitle || notificationBody) {
            const notificationOptions = {
                body: notificationBody || '',
                icon: '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.notificationId || payload.data?.type || 'vrushahi-notification',
                data: payload.data || {},
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200, 100, 200]
            };

            event.waitUntil(
                self.registration.showNotification(notificationTitle || 'vrushahi Notification', notificationOptions)
            );
        }
    } catch (e) {
        // Not a JSON payload, text fallback
        const text = event.data.text();
        if (text) {
            event.waitUntil(
                self.registration.showNotification('vrushahi Notification', {
                    body: text,
                    icon: '/favicon.png',
                    badge: '/favicon.png'
                })
            );
        }
    }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    const urlToOpen = data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window/tab open
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    if (urlToOpen && urlToOpen !== '/') {
                        client.navigate(urlToOpen);
                    }
                    return client.focus();
                }
            }
            // If no window/tab is open, open the URL
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
