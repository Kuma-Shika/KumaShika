// ============================================================
//  db.js  —  All Firebase & data-access functions
//  No DOM manipulation here. Pure data in, data out.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, collection }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { getTodayLocal } from "../utils/date.js";
import { getCurrentUser } from "./store.js";


const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// ── User ─────────────────────────────────────────────────────

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


export async function saveOverride(username, wordId, changes) {
  const updates = {};
  for (const [key, value] of Object.entries(changes)) {
    updates[`overrides.${wordId}.${key}`] = value;
  }
  await updateDoc(doc(db, "users", username), updates);
}

export async function saveCustomSubject(username, data) {
  // Génère un id basé sur le timestamp pour éviter les conflits
  const newId = 100000 + Date.now() % 900000;

  await setDoc(doc(db, "custom_subjects", String(newId)), {
    ...data,
    id: newId,
    createdBy: username,
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



// ============================================================
//  ADD THESE FUNCTIONS TO index/db.js
//  They replace quiz/user-db.js.
//  They use the existing dbGet / updateDoc / doc / db / currentUser
//  already in db.js — no new imports needed except getTodayLocal.
// ============================================================


// ── Card progress ─────────────────────────────────────────────

export async function updateCardProgress(q, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return;

  const cardsData = snap.data().cards ?? {};
  const entry = cardsData[q.id]?.[q.kind];

  if (entry) {
    await updateDoc(doc(db, "users", username), {
      [`cards.${q.id}.${q.kind}.attempts`]: (entry.attempts || 0) + 1,
      [`cards.${q.id}.${q.kind}.correct`]:
        isCorrect ? (entry.correct || 0) + 1 : (entry.correct || 0),
    });
  } else {
    await updateDoc(doc(db, "users", username), {
      [`cards.${q.id}.${q.kind}`]: { attempts: 1, correct: isCorrect ? 1 : 0 },
    });
  }
}

// ── Level completion ──────────────────────────────────────────

export async function markLevelSuccess(levelKey) {
  const username = getCurrentUser();
  if (!username) return;
  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return;

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