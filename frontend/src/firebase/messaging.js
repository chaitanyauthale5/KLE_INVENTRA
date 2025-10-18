import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

function getConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBFMqQ3lfXjKOZmTcoFHjvxE2iB8AOXg1s',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ayursutra-df451.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ayursutra-df451',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ayursutra-df451.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1033179513643',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1033179513643:web:d63340e00485809ef37b6e',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-0TYYNLEP36',
  };
}

async function registerTokenWithBackend(token) {
  try {
    localStorage.setItem('ayursutra_fcm_token', token);
    const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
    const headers = { 'Content-Type': 'application/json' };
    const bearer = localStorage.getItem('ayursutra_token');
    if (!bearer) return; // skip registering when not logged in to avoid 401 spam
    headers['Authorization'] = `Bearer ${bearer}`;
    await fetch(`${API_BASE}/api/notifications/register-token`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  } catch {}
}

export async function initPush() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const supported = await isSupported().catch(() => false);
    if (!supported) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const app = initializeApp(getConfig());
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BNQh3aZkm_irF6eC8M86GmXOIR7wQpwJNeuY0mhpUjrO7OuHSwYpbyOCly4BeNRlbOzqZSvJz-cMnXuldJaoXPY';
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg }).catch(() => null);
    if (token) await registerTokenWithBackend(token);
    onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || payload?.data?.title || 'AyurSutra';
      const message = payload?.notification?.body || payload?.data?.message || '';
      try { if (window.showNotification) window.showNotification({ title, message, type: 'info' }); } catch {}
    });
  } catch {}
}
