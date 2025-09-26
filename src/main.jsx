import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Register Firebase Messaging service worker and request notification permission
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const sid = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
    const swUrl = sid ? `/firebase-messaging-sw.js?msid=${encodeURIComponent(sid)}` : '/firebase-messaging-sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
)
