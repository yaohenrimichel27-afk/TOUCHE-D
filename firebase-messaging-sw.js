importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDk2YSC6ceAfidPN0QZb8ajuZcVr1oeNw8",
  authDomain: "restaurant-la-touche-d.firebaseapp.com",
  projectId: "restaurant-la-touche-d",
  storageBucket: "restaurant-la-touche-d.firebasestorage.app",
  messagingSenderId: "751707075137",
  appId: "1:751707075137:web:453f83d21738db02938cc0"
});

const messaging = firebase.messaging();

// Notification reçue quand app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: payload.data
  });
});
