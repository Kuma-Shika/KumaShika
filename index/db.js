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

// Helpers internes
async function getOwnLevels(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? (snap.data().ownLevels || {}) : {};
}

function getNodeAtPath(root, path) {
  let node = root;
  for (const key of path) {
    if (!node[key]?.children) return null;
    node = node[key].children;
  }
  return node;
}

// Remplace l'ancienne saveOwnText
export async function saveOwnText(username, title, analysis, path = []) {
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");

  parent[title] = { type: "text", vocabulary: analysis.ids.vocabulary, kanji: analysis.ids.kanji };

  const cardUpdates = {};
  for (const [id, occ] of Object.entries(analysis.occurrences)) {
    cardUpdates[`cards.${id}.occurrences`] = arrayUnion(...occ);
  }

  await updateDoc(doc(db, "users", username), { ownLevels: root, ...cardUpdates });
}

// Remplace l'ancienne saveOwnFolder
export async function saveOwnFolder(username, folderName, path = []) {
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");
  if (parent[folderName] !== undefined) throw new Error("already_exists");

  parent[folderName] = { type: "folder", children: {} };
  await updateDoc(doc(db, "users", username), { ownLevels: root });
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

export async function fetchCardOccurrences(username, wordId) {
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return [];
  console.log("Card occurrences for wordId", wordId, ":", snap.data().cards?.[wordId]?.occurrences);
  return snap.data().cards?.[wordId]?.occurrences ?? [];
}


export async function setCardKnown(username, wordId) {
  await updateDoc(doc(db, "users", username), {
    [`cards.${wordId}.known`]: true,
  });
}

export async function setCardUnknown(username, wordId) {
  await updateDoc(doc(db, "users", username), {
    [`cards.${wordId}.known`]: false,
  });
}

export async function setCardsKnown(username, wordIds) {
  const updates = {};
  for (const id of wordIds) {
    updates[`cards.${id}.known`] = true;
  }
  await updateDoc(doc(db, "users", username), updates);
}