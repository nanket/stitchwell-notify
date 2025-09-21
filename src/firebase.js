import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

let app;
let messaging;

export const initFirebase = async () => {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  
  console.debug('[Firebase] Initializing with config:', {
    hasApiKey: !!cfg.apiKey,
    hasAuthDomain: !!cfg.authDomain,
    hasProjectId: !!cfg.projectId,
    hasStorageBucket: !!cfg.storageBucket,
    hasMessagingSenderId: !!cfg.messagingSenderId,
    hasAppId: !!cfg.appId,
    projectId: cfg.projectId || 'NOT_SET',
    timestamp: new Date().toISOString() // Force fresh deployment
  });
  
  if (!cfg.apiKey || !cfg.messagingSenderId || !cfg.appId) {
    console.error('[Firebase] Missing required config:', {
      apiKey: !cfg.apiKey ? 'MISSING' : 'OK',
      messagingSenderId: !cfg.messagingSenderId ? 'MISSING' : 'OK',
      appId: !cfg.appId ? 'MISSING' : 'OK'
    });
    // Missing config; skip initialization gracefully
    return null;
  }
  if (!getApps().length) {
    app = initializeApp(cfg);
    try {
      const db = getFirestore();
      // Enable offline persistence so writes/reads work offline and sync later
      enableIndexedDbPersistence(db).catch(() => {});
    } catch (_) {}
  }
  try {
    if (await isSupported()) {
      messaging = getMessaging();
    }
  } catch (e) {
    // messaging not supported (e.g., Safari private mode)
  }
  return app;
};

export const getFcmToken = async () => {
  try {
    console.debug('[FCM] Starting token generation...');
    if (!messaging) {
      console.debug('[FCM] No messaging instance');
      return null;
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      console.debug('[FCM] Notification permission not granted:', Notification.permission);
      return null;
    }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.debug('[FCM] No VAPID key in env');
      return null;
    }
    console.debug('[FCM] VAPID key present:', vapidKey.substring(0, 20) + '...');

    console.debug('[FCM] Waiting for service worker...');
    const reg = await navigator.serviceWorker.ready;
    console.debug('[FCM] Service worker ready:', reg.scope, 'active:', !!reg.active);

    console.debug('[FCM] Calling getToken...');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    console.debug('[FCM] Token result:', token ? `SUCCESS (${token.substring(0,20)}...)` : 'NULL');

    if (!token) {
      console.debug('[FCM] Token generation failed - checking common issues...');
      console.debug('[FCM] - SW active:', !!reg.active);
      console.debug('[FCM] - SW scope:', reg.scope);
      console.debug('[FCM] - Messaging supported:', await isSupported());
    }

    return token || null;
  } catch (e) {
    console.error('[FCM] Token generation error:', e);
    return null;
  }
};

export const onMessageListener = (cb) => {
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
};

