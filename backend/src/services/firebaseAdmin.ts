import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let isFirebaseInitialized = false;

try {
    let serviceAccount: any;

    // 1. Try config file from multiple possible paths
    const possiblePaths: string[] = [];

    // a) Explicit env path (highest priority)
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (envPath) {
        possiblePaths.push(path.resolve(process.cwd(), envPath));
    }

    // b) Relative to __dirname (works in both dev: src/services/ and prod: dist/services/)
    possiblePaths.push(
        path.resolve(__dirname, '../config/firebase-service-account.json'),  // src/services -> src/config
        path.resolve(__dirname, '../../src/config/firebase-service-account.json'), // dist/services -> src/config
        path.resolve(__dirname, '../../config/firebase-service-account.json'), // dist/services -> config/
    );

    // c) Relative to project root (cwd)
    possiblePaths.push(
        path.resolve(process.cwd(), 'src/config/firebase-service-account.json'),
        path.resolve(process.cwd(), 'config/firebase-service-account.json'),
    );

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                // Use fs.readFileSync + JSON.parse instead of require() to avoid caching issues
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                serviceAccount = JSON.parse(fileContent);
                console.log('✅ Firebase service account loaded from file:', filePath);
                break;
            } catch (err) {
                console.warn(`⚠️ Found but failed to parse service account file at ${filePath}:`, err);
            }
        }
    }

    if (!serviceAccount) {
        console.log('ℹ️ No service account JSON file found. Checked paths:', possiblePaths);
    }

    // 2. Fallback to Environment Variable (handles multi-line .env values)
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            // Clean the env value: remove surrounding quotes and fix escaped newlines
            let rawValue = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
            // Remove wrapping single or double quotes that dotenv might leave
            if ((rawValue.startsWith("'") && rawValue.endsWith("'")) ||
                (rawValue.startsWith('"') && rawValue.endsWith('"'))) {
                rawValue = rawValue.slice(1, -1);
            }
            // Replace literal \n with actual newlines in the private_key
            rawValue = rawValue.replace(/\\\\n/g, '\\n');

            serviceAccount = JSON.parse(rawValue);
            console.log('✅ Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT env variable');
        } catch (err) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', err);
            console.error('   Raw value starts with:', process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 50));
        }
    }

    // 3. Initialize if credentials found
    if (serviceAccount) {
        // Validate required fields
        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            console.error('❌ Service account JSON is missing required fields (project_id, private_key, client_email)');
        } else if (admin.apps.length === 0) {
            try {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                isFirebaseInitialized = true;
                console.log(`✅ Firebase Admin SDK initialized successfully (project: ${serviceAccount.project_id})`);
            } catch (initErr) {
                console.error('❌ Failed to initialize admin SDK:', initErr);
            }
        } else {
            isFirebaseInitialized = true;
        }
    } else {
        console.warn('⚠️ Firebase service account not found via file OR env variable. Push notifications are DISABLED.');
    }

} catch (error) {
    console.error('CRITICAL: Error during Firebase initialization logic:', error);
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: { [key: string]: string };
}

/**
 * Send push notification to multiple tokens
 */
export async function sendPushNotification(tokens: string[], payload: PushNotificationPayload) {
    if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

    if (!isFirebaseInitialized) {
        console.warn(`[${new Date().toISOString()}] Firebase not initialized. Cannot send to ${tokens.length} tokens.`);
        return { successCount: 0, failureCount: tokens.length };
    }

    try {
        const message: any = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: {
                title: payload.title,
                body: payload.body,
                ...(payload.data || {}),
            },
            tokens: tokens,
            // Mobile Specifics
            android: {
                priority: 'high',
                notification: {
                    title: payload.title,
                    body: payload.body,
                    sound: 'default',
                    channelId: 'vrushahi_notifications', // Ensure this matches your Flutter side channel if defined
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: payload.title,
                            body: payload.body,
                        },
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true,
                    },
                },
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: '86400',
                },
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: payload.data?.link || '/',
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${new Date().toISOString()}] FCM Send to ${tokens.length} tokens: ${response.successCount} success, ${response.failureCount} failure`);

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}
