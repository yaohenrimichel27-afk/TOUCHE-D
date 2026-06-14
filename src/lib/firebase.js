import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDk2YSC6ceAfidPN0QZb8ajuZcVr1oeNw8",
  authDomain: "restaurant-la-touche-d.firebaseapp.com",
  projectId: "restaurant-la-touche-d",
  storageBucket: "restaurant-la-touche-d.firebasestorage.app",
  messagingSenderId: "751707075137",
  appId: "1:751707075137:web:453f83d21738db02938cc0",
  measurementId: "G-292QVSKSHX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
