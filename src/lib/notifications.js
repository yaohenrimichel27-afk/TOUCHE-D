import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import app from "./firebase";

const VAPID_KEY =
  "BAkn30Zbp4q9KbdcSCBwQGg2RuQQylEY1y4CnzzlSf3WxL0i8Mv9hKVuXWwabXWvVDVOHs0I-tehuaJdPv73FIM";

let messaging = null;
let swRegistration = null;

function isMessagingSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registerServiceWorker() {
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.error("SW registration error:", err);
    return null;
  }
}

function getMessagingInstance() {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export async function activerNotifications(userId) {
  try {
    if (!isMessagingSupported()) {
      return {
        success: false,
        reason: "Notifications non supportees sur ce navigateur"
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: "Permission refusee" };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, reason: "Service worker indisponible" };
    }

    const msg = getMessagingInstance();
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) return { success: false, reason: "Token non obtenu" };

    await setDoc(
      doc(db, "settings", "fcm"),
      {
        token,
        userId,
        updatedAt: new Date()
      },
      { merge: true }
    );

    return { success: true, token };
  } catch (err) {
    console.error("FCM error:", err);
    return { success: false, reason: err.message || "Erreur inconnue" };
  }
}

export function ecouterNotifications(callback) {
  if (!isMessagingSupported()) return () => {};
  try {
    const msg = getMessagingInstance();
    return onMessage(msg, (payload) => {
      callback(payload);
    });
  } catch {
    return () => {};
  }
}

export function notifierObjectifAtteint(totalVentes, objectif) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("🎯 Objectif atteint ! — La Touche D", {
        body:
          "Felicitations ! " +
          totalVentes.toLocaleString("fr-FR") +
          " FCFA de ventes aujourd'hui. Objectif de " +
          objectif.toLocaleString("fr-FR") +
          " FCFA depasse ! 🔥",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        vibrate: [300, 100, 300, 100, 300],
        tag: "objectif-atteint"
      });
    });
  } else {
    new Notification("🎯 Objectif atteint ! — La Touche D", {
      body:
        "Felicitations ! " +
        totalVentes.toLocaleString("fr-FR") +
        " FCFA de ventes aujourd'hui.",
      icon: "/favicon.svg"
    });
  }
}

export async function getObjectif() {
  try {
    const snap = await getDoc(doc(db, "settings", "objectif"));
    return snap.exists() ? snap.data().montant : 100000;
  } catch {
    return 100000;
  }
}

export async function setObjectif(montant) {
  await setDoc(doc(db, "settings", "objectif"), { montant }, { merge: true });
}
