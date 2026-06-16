import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "./firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import app from "./firebase";

const VAPID_KEY = "BAkn30Zbp4q9KbdcSCBwQGg2RuQQylEY1y4CnzzlSf3WxL0i8Mv9hKVuXWwabXWvVDVOHs0I-tehuaJdPv73FIM";

let messaging = null;

function getMessagingInstance() {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

/**
 * Demande la permission + récupère le token FCM
 * Sauvegarde le token dans Firestore sous /settings/fcm
 */
export async function activerNotifications(userId) {
  try {
    // iOS Safari nécessite une action utilisateur pour demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: "Permission refusée" };
    }

    const msg = getMessagingInstance();
    const token = await getToken(msg, { vapidKey: VAPID_KEY });

    if (!token) return { success: false, reason: "Token non obtenu" };

    // Sauvegarde dans Firestore
    await setDoc(doc(db, "settings", "fcm"), {
      token,
      userId,
      updatedAt: new Date()
    }, { merge: true });

    return { success: true, token };
  } catch (err) {
    console.error("FCM error:", err);
    return { success: false, reason: err.message };
  }
}

/**
 * Écoute les notifications en foreground
 */
export function ecouterNotifications(callback) {
  try {
    const msg = getMessagingInstance();
    return onMessage(msg, (payload) => {
      callback(payload);
    });
  } catch {
    return () => {};
  }
}

/**
 * Envoie une notification locale (dans l'app)
 * pour l'objectif atteint
 */
export function notifierObjectifAtteint(totalVentes, objectif) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification("🎯 Objectif atteint ! — La Touche D", {
    body: `Félicitations ! ${totalVentes.toLocaleString("fr-FR")} FCFA de ventes aujourd'hui. Objectif de ${objectif.toLocaleString("fr-FR")} FCFA dépassé ! 🔥`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [300, 100, 300, 100, 300],
    tag: "objectif-atteint", // évite les doublons
  });
}

/**
 * Récupère l'objectif journalier depuis Firestore
 */
export async function getObjectif() {
  try {
    const snap = await getDoc(doc(db, "settings", "objectif"));
    return snap.exists() ? snap.data().montant : 100000;
  } catch {
    return 100000;
  }
}

/**
 * Sauvegarde l'objectif journalier
 */
export async function setObjectif(montant) {
  await setDoc(doc(db, "settings", "objectif"), { montant }, { merge: true });
}
