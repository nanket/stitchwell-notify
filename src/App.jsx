import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import useStore from './store/useStore';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import { USER_ROLES } from './store/useStore';

function App() {
  const { currentUser, currentUserRole, registerFcmToken, addNotification, restoreUserSession } = useStore();

  // Restore user session on app load
  useEffect(() => {
    restoreUserSession();
  }, [restoreUserSession]);

  useEffect(() => {
    const run = async () => {
      const { initFirebase, getFcmToken, onMessageListener } = await import('./firebase');
      await initFirebase();
      console.log('currentUser', currentUser);
      if (currentUser) {
        const token = await getFcmToken();
        console.log('token', token);

        if (token) registerFcmToken(currentUser, token);
        try {
          onMessageListener((payload) => {
            const title = payload.notification?.title || 'New Task Assigned';
            const body = payload.notification?.body || 'You have a new update';
            addNotification(currentUser, `${title}: ${body}`);
          });
        } catch (_) {}
      }
    };
    run();
  }, [currentUser, registerFcmToken, addNotification]);

  // Install prompt (A2HS)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      // Show a lightweight toast to install
      const tId = toast((t) => (
        <div>
          <div className="font-semibold mb-1">Install StitchWell?</div>
          <div className="text-sm mb-2">Add the app to your home screen for better notifications.</div>
          <div className="flex gap-2">
            <button className="btn-primary px-3 py-1" onClick={async () => {
              toast.dismiss(t.id);
              e.prompt();
              try { await e.userChoice; } catch (_) {}
            }}>Install</button>
            <button className="btn-secondary px-3 py-1" onClick={() => toast.dismiss(t.id)}>Later</button>
          </div>
        </div>
      ), { duration: 10000 });
      // Optionally store e for a custom install button later
      window.__deferredInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show login screen if no user is logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginScreen />
        <Toaster position="top-right" />
      </div>
    );
  }

  // Show appropriate dashboard based on user role
  const needsNotifEnable = typeof Notification !== 'undefined' && Notification.permission !== 'granted';
  const enableNotifications = async () => {
    try {
      console.log('[Notif] Starting enableNotifications...');
      console.log('[Notif] Environment variables:', {
        REGISTER_TOKEN_ENDPOINT: import.meta.env.VITE_REGISTER_TOKEN_ENDPOINT,
        PUSH_ENDPOINT: import.meta.env.VITE_PUSH_ENDPOINT,
        currentUser
      });

      // Basic environment checks
      const isHttps = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('[Notif] HTTPS check:', { isHttps, protocol: location.protocol, hostname: location.hostname });
      if (!isHttps) {
        toast.error('Notifications require HTTPS or localhost');
        return;
      }
      if (!('serviceWorker' in navigator)) {
        toast.error('Service workers not supported on this device');
        return;
      }
      // Request permission via user gesture
      console.log('[Notif] Current permission:', Notification.permission);
      const perm = await Notification.requestPermission();
      console.debug('[Notif] requestPermission result =', perm);
      if (perm === 'granted') {
        const { getFcmToken } = await import('./firebase');
        const token = await getFcmToken();
        console.debug('[Notif] FCM token =', token);
        if (!token) {
          toast.error('Failed to get device token. Check VAPID key and SW.');
          return;
        }
        if (currentUser) registerFcmToken(currentUser, token);
        toast.success('Notifications enabled');
      } else if (perm === 'denied') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          toast('Notifications denied. Enable in iOS Settings → Notifications → StitchWell');
        } else {
          toast('Notifications denied in browser settings');
        }
      } else {
        toast('Notifications not granted (permission: default)');
      }
    } catch (e) {
      console.error('[Notif] enable error', e);
      toast.error('Notification setup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {needsNotifEnable && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 p-3 flex items-center justify-between">
          <div>
            Enable notifications to receive task alerts even when the app is closed.
          </div>
          <button className="px-3 py-1 bg-amber-600 text-white rounded" onClick={enableNotifications}>Enable</button>
        </div>
      )}
      {currentUserRole === USER_ROLES.ADMIN ? (
        <AdminDashboard />
      ) : (
        <WorkerDashboard />
      )}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
