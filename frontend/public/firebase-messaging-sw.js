/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Firebase web config (public)
firebase.initializeApp({
  apiKey: 'AIzaSyBFMqQ3lfXjKOZmTcoFHjvxE2iB8AOXg1s',
  authDomain: 'ayursutra-df451.firebaseapp.com',
  projectId: 'ayursutra-df451',
  storageBucket: 'ayursutra-df451.firebasestorage.app',
  messagingSenderId: '1033179513643',
  appId: '1:1033179513643:web:d63340e00485809ef37b6e',
  measurementId: 'G-0TYYNLEP36',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = (payload && payload.notification && payload.notification.title) || (payload && payload.data && payload.data.title) || 'AyurSutra';
  const notificationOptions = {
    body: (payload && payload.notification && payload.notification.body) || (payload && payload.data && payload.data.message) || '',
    icon: '/icons/icon-192.png',
    data: payload && payload.data ? payload.data : {},
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = self.location.origin || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
