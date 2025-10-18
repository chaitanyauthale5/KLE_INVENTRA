import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initPush } from '@/firebase/messaging.js'
import { initSocket } from '@/realtime/socket.js'

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 

// Disable service workers and aggressively recover from stale chunk caches
// 1) Unregister any existing service workers to avoid stale app shell
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.().then((regs) => {
    (regs || []).forEach((r) => {
      const scriptUrl = r?.active?.scriptURL || r?.installing?.scriptURL || r?.waiting?.scriptURL || '';
      // Keep Firebase Messaging SW
      if (scriptUrl.includes('firebase-messaging-sw.js')) return;
      r.unregister().catch(() => {});
    });
  }).catch(() => {});
}

// 1b) Clear all CacheStorage buckets (stale hashed chunks/images)
if (typeof caches !== 'undefined' && caches?.keys) {
  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
}

// 2) Auto-reload on chunk/script load failures (common after deploys)
window.addEventListener('unhandledrejection', (event) => {
  const name = event?.reason?.name;
  const msg = String(event?.reason?.message || event?.reason || '');
  if (name === 'ChunkLoadError' || /Loading chunk \d+ failed/i.test(msg) || /ChunkLoadError/i.test(msg)) {
    window.location.reload();
  }
});
window.addEventListener('error', (e) => {
  const t = e?.target;
  if (t && t.tagName === 'SCRIPT') {
    // If a script tag failed to load (likely a hashed chunk), reload the page
    window.location.reload();
  }
}, true);

// Initialize web push after page becomes interactive (only if logged in)
try { if (localStorage.getItem('ayursutra_token')) initPush(); } catch {}

// Initialize WebSocket client
try { initSocket(); } catch {}