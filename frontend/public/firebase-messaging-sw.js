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
firebase.initializeApp(firebaseConfig);

// Initialize messaging
let messaging;
try {
    messaging = firebase.messaging();
} catch (err) {
    console.error('Failed to initialize messaging in SW:', err);
}

if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);

        // Customize notification here
        const notificationTitle = payload.notification?.title || 'New Message';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: '/favicon.ico',
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    const urlToOpen = data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window/tab open with the target URL
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
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
