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
                // IMPORTANT: Rigorously reconstruct the private key to fix ASN.1 / DER parsing errors.
                // This fixes issues if the key was copy-pasted incorrectly, wrapped, or has literal \n
                let key = serviceAccount.private_key;
                
                // First, replace any literal \n with spaces temporarily, and replace \r
                key = key.replace(/\\n/g, ' ').replace(/\\r/g, '');
                
                // Extract just the base64 content between the BEGIN and END markers
                const beginMarker = '-----BEGIN PRIVATE KEY-----';
                const endMarker = '-----END PRIVATE KEY-----';
                
                if (key.includes(beginMarker) && key.includes(endMarker)) {
                    let base64Content = key.split(beginMarker)[1].split(endMarker)[0];
                    // Remove ALL whitespace (spaces, newlines, tabs) from the base64 body
                    base64Content = base64Content.replace(/\s+/g, '');
                    
                    // Reconstruct the key with standard 64-character lines
                    const matched = base64Content.match(/.{1,64}/g);
                    if (matched) {
                        serviceAccount.private_key = `${beginMarker}\n${matched.join('\n')}\n${endMarker}\n`;
                    }
                }

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
            // No `notification`/`webpush.notification` block here: the frontend's
            // onMessage (foreground) and onBackgroundMessage (SW) handlers both build
            // and display the notification manually from `data`. Including a
            // notification payload as well causes the browser to auto-display it
            // *in addition to* that manual call, producing two notifications per message.
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: '86400',
                },
                fcmOptions: {
                    link: payload.data?.link || '/',
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${new Date().toISOString()}] FCM Send to ${tokens.length} tokens: ${response.successCount} success, ${response.failureCount} failure`);

        if (response.failureCount > 0) {
            response.responses.forEach((r, i) => {
                if (!r.success) {
                    console.warn(`[FCM] Token #${i} (${tokens[i].slice(0, 12)}...) failed: ${r.error?.code} - ${r.error?.message}`);
                }
            });
        }

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}
