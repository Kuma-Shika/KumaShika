// ============================================================
//  db.js  —  All Firebase & data-access functions
//  No DOM manipulation here. Pure data in, data out.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, collection, increment, deleteField, arrayRemove }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { getTodayLocal } from "../utils/date.js";
import { getCurrentUser } from "./store.js";
import { nextSRSLevel, nextReviewDate } from "../utils/srs.js";


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

export async function updateCardProgress(q, isCorrect, mode) {
  const username = getCurrentUser();
  if (!username) return;

  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return;

  const entry = snap.data().cards?.[q.id]?.[q.kind];
  const currentSRS = entry?.srs_level ?? -1;
  const newSRS = isCorrect ? Math.min(currentSRS + 1, 5) : 0;
  const nextReview = isCorrect
    ? nextReviewDate(newSRS)
    : new Date().toISOString().split("T")[0];  // ← aujourd'hui si raté

  await updateDoc(doc(db, "users", username), {
    [`cards.${q.id}.${q.kind}.attempts`]: increment(1),
    [`cards.${q.id}.${q.kind}.correct`]: isCorrect ? increment(1) : increment(0),
    [`cards.${q.id}.${q.kind}.srs_level`]: newSRS,
    [`cards.${q.id}.${q.kind}.next_review`]: nextReview,
  });

  if (isCorrect) {
    if (mode === "daily") await updateDailyProgress("new");
    if (mode === "reviews") await updateDailyProgress("reviews");
  }
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
    vocabulary: analysis.encoded.vocabulary,
    kanji: analysis.encoded.kanji,
    rawText,
  };

  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

// Bulk import : une seule écriture Firestore pour N textes.
// On ne stocke PAS les occurrences (évite l'explosion d'index).
export async function saveBulkOwnTexts(entries, folderName, path = []) {
  // entries = [{ title, analysis, rawText }]
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);

  // Crée le dossier s'il n'existe pas
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");
  if (!parent[folderName]) {
    parent[folderName] = { type: "folder", children: {} };
  }
  const folder = parent[folderName].children;

  for (const { title, analysis, rawText } of entries) {
    folder[title] = {
      type: "text",
      vocabulary: analysis.encoded.vocabulary,
      kanji: analysis.encoded.kanji,
      rawText,
    };
  }

  // Une seule écriture — pas de cardUpdates pour éviter l'index explosion
  await updateDoc(doc(db, "users", username), { ownLevels: root });
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

  parent[name].vocabulary = analysis.encoded.vocabulary;
  parent[name].kanji = analysis.encoded.kanji;
  parent[name].rawText = rawText;

  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

export async function updateCardSRS(subjectId, exercise, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;

  const snap = await getDoc(doc(db, "users", username));
  if (!snap.exists()) return;

  const card = snap.data().cards?.[subjectId];
  const currentLevel = card?.[exercise]?.srs_level ?? 0;
  const newLevel = nextSRSLevel(currentLevel, isCorrect);
  const nextReview = nextReviewDate(newLevel);

  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.${exercise}.srs_level`]: newLevel,
    [`cards.${subjectId}.${exercise}.next_review`]: nextReview,
    [`cards.${subjectId}.${exercise}.attempts`]: increment(1),
    ...(isCorrect ? {
      [`cards.${subjectId}.${exercise}.correct`]: increment(1)
    } : {}),
  });
}

export async function skipDailyWord(subjectId) {
  const username = getCurrentUser();
  if (!username) return;
  await setCardKnown(subjectId);
  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.reading.srs_level`]: 8,
    [`cards.${subjectId}.reading.next_review`]: deleteField(),
  });
}


export async function initDailyReviews(reviewIds) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();

  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.reviews_list`]: reviewIds,
    [`streak.${today}.reviews_total`]: reviewIds.length,
    // reviews_done reste à 0 si pas encore initialisé
  });
}

export async function removeFromReviewsList(subjectId, exercise) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.reviews_list`]: arrayRemove(`${subjectId}_${exercise}`),
  });
}


export async function updateDailyProgress(type) {
  // type = "new" ou "reviews"
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  const field = type === "new" ? "new_done" : "reviews_done";
  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.${field}`]: increment(1),
  });
}


// Initialise les reviews du jour si pas encore fait
export async function initDailyReviewsIfNeeded(userData) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();

  // Si déjà initialisé aujourd'hui, ne rien faire
  if (userData?.streak?.[today]?.reviews_list !== undefined) return;

  const allSubjects = window.ALL_SUBJECTS ?? {};
  const { getReviewsDue } = await import("../utils/dailyWords.js");
  const due = getReviewsDue(userData, allSubjects);
  const ids = due.map(d => `${d.id}_${d.exercise}`);

  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.reviews_list`]: ids,
    [`streak.${today}.reviews_number`]: ids.length,
  });
}

// Enregistre une bonne réponse en daily
export async function recordNewWordDone(subjectId, exercise) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.${exercise}.srs_level`]: 0,
    [`cards.${subjectId}.${exercise}.next_review`]: nextReviewDate(0), // demain
    [`streak.${today}.new_done`]: increment(1),
  });
}

// Enregistre une bonne review
export async function recordReviewCorrect(subjectId, exercise, currentSRSLevel) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  const newSRS = Math.min(currentSRSLevel + 1, 5);
  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.${exercise}.srs_level`]: newSRS,
    [`cards.${subjectId}.${exercise}.next_review`]: nextReviewDate(newSRS),
    [`cards.${subjectId}.${exercise}.attempts`]: increment(1),
    [`cards.${subjectId}.${exercise}.correct`]: increment(1),
    [`streak.${today}.reviews_done`]: increment(1),
    [`streak.${today}.reviews_list`]: arrayRemove(`${subjectId}_${exercise}`),
  });
}

// Enregistre une mauvaise review
export async function recordReviewWrong(subjectId, exercise) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.${exercise}.srs_level`]: 0,
    [`cards.${subjectId}.${exercise}.next_review`]: today,
    [`cards.${subjectId}.${exercise}.attempts`]: increment(1),
  });
}

// Stats génériques pour quiz normal
export async function recordCardAttempt(subjectId, exercise, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;
  await updateDoc(doc(db, "users", username), {
    [`cards.${subjectId}.${exercise}.attempts`]: increment(1),
    [`cards.${subjectId}.${exercise}.correct`]: isCorrect ? increment(1) : increment(0),
  });
}