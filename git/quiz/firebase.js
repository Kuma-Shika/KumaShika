// =========================================================
// FIREBASE — initialisation + helpers d'accès base de données
// =========================================================

import { initializeApp }  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export { arrayUnion, onSnapshot, doc };

const firebaseConfig = {
  apiKey:            "AIzaSyDSqsd9LnK6CX8vMV2vzkx5FbB6tg6PrDM",
  authDomain:        "kumashika-5f5aa.firebaseapp.com",
  projectId:         "kumashika-5f5aa",
  storageBucket:     "kumashika-5f5aa.firebasestorage.app",
  messagingSenderId: "390122758489",
  appId:             "1:390122758489:web:4dc111ac19cb4ff3182c48",
  measurementId:     "G-Y5GND1BNLK",
};

const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);

/**
 * Lit un document Firestore.
 * @param {string} path  "collection/docId"  ex: "users/john"
 * @returns {Promise<DocumentSnapshot>}
 */
export async function dbGet(path) {
  const ref = doc(db, ...path.split("/"));
  return getDoc(ref);
}

/**
 * Met à jour (merge) des champs dans un document Firestore.
 * @param {string} path   "collection/docId"  ex: "users/john"
 * @param {Object} data   Champs à écrire
 * @returns {Promise<void>}
 */
export async function dbSet(path, data) {
  const ref = doc(db, ...path.split("/"));
  return updateDoc(ref, data);
}

/**
 * Retourne le nom de l'utilisateur courant depuis localStorage.
 * @returns {string|null}
 */
export function currentUser() {
  return localStorage.getItem("currentUser");
}
