import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 

// Register Service Worker (production only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}