// ============================================================
//  db.js  —  All Firebase & data-access functions
//  No DOM manipulation here. Pure data in, data out.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, collection, increment }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { getTodayLocal } from "../utils/date.js";
import { getCurrentUser } from "./store.js";


const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// ── User ─────────────────────────────────────────────────────

export async function createUser(username) {
  await setDoc(doc(db, "users", username), {
    id: username,
    createdAt: serverTimestamp(),
  });
}

export async function userExists(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists();
}

export async function fetchUserByName(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? snap.data() : null;
}

export async function fetchCurrentUser() {
  const username = getCurrentUser();
  if (!username) return null;
  return fetchUserByName(username);
}


export async function fetchUserCards() {
  const username = getCurrentUser();
  if (!username) return null;
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return null;
  return snap.data().cards ?? null;
}

// ── Streak ───────────────────────────────────────────────────

export async function fetchStreakData() {
  const username = getCurrentUser();
  if (!username) return null;
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return null;
  return snap.data().streak || {};
}

export async function fetchCardOccurrences(wordId) {
  const username = getCurrentUser();
  if (!username) return [];
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return [];
  return snap.data().cards?.[wordId]?.occurrences ?? [];
}


export async function setCardKnown(wordId) {
  const username = getCurrentUser();
  if (!username) return;
  await updateDoc(doc(db, "users", username), {
    [`cards.${wordId}.known`]: true,
  });
}

export async function setCardUnknown(wordId) {
  const username = getCurrentUser();
  if (!username) return;
  await updateDoc(doc(db, "users", username), {
    [`cards.${wordId}.known`]: false,
  });
}

export async function setCardsKnown(wordIds) {
  const username = getCurrentUser();
  if (!username) return;
  const updates = {};
  for (const id of wordIds) {
    updates[`cards.${id}.known`] = true;
  }
  await updateDoc(doc(db, "users", username), updates);
}


export async function saveOverride(wordId, changes) {
  const username = getCurrentUser();
  if (!username) return;
  const updates = {};
  for (const [key, value] of Object.entries(changes)) {
    updates[`overrides.${wordId}.${key}`] = value;
  }
  await updateDoc(doc(db, "users", username), updates);
}

export async function saveCustomSubject(data) {
  const username = getCurrentUser();
  if (!username) return null;
  const newId = 100000 + Date.now() % 900000;
  await setDoc(doc(db, "custom_subjects", String(newId)), {
    ...data, id: newId, createdBy: username,
  });
  await updateDoc(doc(db, "users", username), {
    customCards: arrayUnion(newId),
  });
  return newId;
}


export async function fetchCustomSubjects() {
  const snap = await getDocs(collection(db, "custom_subjects"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}



// ── Card progress ─────────────────────────────────────────────

export async function updateCardProgress(q, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;
  const updates = {
    [`cards.${q.id}.${q.kind}.attempts`]: increment(1),
  };
  if (isCorrect) {
    updates[`cards.${q.id}.${q.kind}.correct`] = increment(1);
  }
  await updateDoc(doc(db, "users", username), updates);
}

// ── Level completion ──────────────────────────────────────────

export async function markLevelSuccess(levelKey) {
  const username = getCurrentUser();
  if (!username) return;
  await updateDoc(doc(db, "users", username), {
    [`levels.${levelKey}`]: arrayUnion(new Date().toISOString()),
  });
}

// ── Streak ────────────────────────────────────────────────────

async function getTodayStreak(username) {
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) throw new Error("User not found");

  const userData = snap.data();
  const today = getTodayLocal();

  if (!userData.streak?.[today]) {
    await updateDoc(doc(db, "users", username), {
      [`streak.${today}`]: { new: 0, reviews: 0 },
    });
    return { new: 0, reviews: 0 };
  }

  return userData.streak[today];
}

export async function incrementStreakNew() {
  try {
    const username = getCurrentUser();
    if (!username) return;
    const today = getTodayLocal();
    const todayStreak = await getTodayStreak(username);
    await updateDoc(doc(db, "users", username), {
      [`streak.${today}.new`]: todayStreak.new + 1,
    });
  } catch (err) {
    console.error("incrementStreakNew:", err);
  }
}

export async function incrementStreakReviews() {
  try {
    const username = getCurrentUser();
    if (!username) return;
    const today = getTodayLocal();
    const todayStreak = await getTodayStreak(username);
    await updateDoc(doc(db, "users", username), {
      [`streak.${today}.reviews`]: todayStreak.reviews + 1,
    });
  } catch (err) {
    console.error("incrementStreakReviews:", err);
  }
}

// ── Own texts ─────────────────────────────────────────────────

async function getOwnLevels(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? (snap.data().ownLevels || {}) : {};
}

export async function fetchOwnLevels() {
  const username = getCurrentUser();
  if (!username) return null;
  return getOwnLevels(username);
}

function getNodeAtPath(root, path) {
  let node = root;
  for (const key of path) {
    if (!node[key]?.children) return null;
    node = node[key].children;
  }
  return node;
}

export async function saveOwnText(title, analysis, rawText = "", path = []) {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");

  parent[title] = {
    type: "text",
    vocabulary: analysis.ids.vocabulary,
    kanji: analysis.ids.kanji,
    rawText,                              // ← stocké proprement
  };

  const cardUpdates = {};
  for (const [id, occ] of Object.entries(analysis.occurrences)) {
    cardUpdates[`cards.${id}.occurrences`] = arrayUnion(...occ);
  }

  await updateDoc(doc(db, "users", username), { ownLevels: root, ...cardUpdates });
}

export async function saveOwnFolder(folderName, path = []) {
  const username = getCurrentUser();
  if (!username) return;
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



// Supprimer un nœud (texte ou dossier) dans ownLevels
export async function deleteOwnNode(path, name) {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");
  delete parent[name];
  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

// Renommer un dossier
export async function renameOwnFolder(path, oldName, newName) {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent || !parent[oldName]) throw new Error("not_found");
  if (parent[newName]) throw new Error("already_exists");
  parent[newName] = parent[oldName];
  delete parent[oldName];
  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

// Mettre à jour le contenu d'un texte (re-analyse)
export async function updateOwnText(path, name, analysis, rawText = "") {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent || !parent[name]) throw new Error("not_found");

  parent[name].vocabulary = analysis.ids.vocabulary;
  parent[name].kanji = analysis.ids.kanji;
  parent[name].rawText = rawText;

  const cardUpdates = {};
  for (const [id, occ] of Object.entries(analysis.occurrences)) {
    cardUpdates[`cards.${id}.occurrences`] = arrayUnion(...occ);
  }

  await updateDoc(doc(db, "users", username), { ownLevels: root, ...cardUpdates });
}