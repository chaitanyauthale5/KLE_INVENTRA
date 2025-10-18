import { io } from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (socket && socket.connected) return socket;
  try {
    const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
    const url = API_BASE || window.location.origin;
    const token = localStorage.getItem('ayursutra_token');
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token } : {},
    });

    socket.on('connect_error', (err) => {
      // optionally log
      console.warn('[socket] connect_error', err?.message || err);
    });

    socket.on('notification:new', (payload) => {
      const title = payload?.title || 'AyurSutra';
      const message = payload?.message || '';
      try { if (window.showNotification) window.showNotification({ title, message, type: payload?.type || 'info' }); } catch {}
      // Desktop notification (foreground)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification(title, { body: message, icon: '/icons/icon-192.png' }); } catch {}
      }
    });
  } catch {}
  return socket;
}

export function getSocket() { return socket; }
