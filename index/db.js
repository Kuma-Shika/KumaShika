// ============================================================
//  db.js  —  All Firebase & data-access functions
//  No DOM manipulation here. Pure data in, data out.
// ============================================================

import { initializeApp }           from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion }
                                   from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG }         from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

// ── User ─────────────────────────────────────────────────────

export function currentUser() {
  return localStorage.getItem("currentUser");
}

export async function dbGet(path) {
  const ref = doc(db, ...path.split("/"));
  return getDoc(ref);
}

export async function fetchUser(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? snap.data() : null;
}

export async function userExists(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists();
}

export async function createUser(username) {
  await setDoc(doc(db, "users", username), {
    id: username,
    createdAt: serverTimestamp(),
  });
}

// ── Own texts ─────────────────────────────────────────────────

// analysis = { ids: { vocabulary, kanji }, occurrences: { "<id>": [{ sentence, source }] } }
//
// Writes:
//   ownLevels.<title>       = { vocabulary: [...], kanji: [...] }  (plain id lists)
//   cards.<id>.occurrences  = arrayUnion(...new occurrences)        (merged, no duplicates)
export async function saveOwnText(username, title, analysis) {
  const updates = {};

  // ownLevels — plain id lists only
  updates[`ownLevels.${title}`] = analysis.ids;

  // cards — append occurrences for each card id found in this text
  for (const [id, occ] of Object.entries(analysis.occurrences)) {
    updates[`cards.${id}.occurrences`] = arrayUnion(...occ);
  }

  await updateDoc(doc(db, "users", username), updates);
}

// ── Multiplayer ──────────────────────────────────────────────

export async function setGameLevel(gameId, level) {
  await updateDoc(doc(db, "parties", gameId), { level });
}

// ── Streak ───────────────────────────────────────────────────

export async function fetchStreakData(username) {
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return null;
  return snap.data().streak || {};
}