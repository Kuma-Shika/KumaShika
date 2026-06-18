// ============================================================
//  db.js  —  All Firebase & data-access functions
//  Cards stored in card_chunks subcollection (tranches de 1000)
//  No DOM manipulation here. Pure data in, data out.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  getDocs, serverTimestamp, arrayUnion, arrayRemove, increment, deleteField
}
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { getTodayLocal } from "../utils/date.js";
import { getCurrentUser } from "./store.js";
import { nextSRSLevel, nextReviewDate } from "../utils/srs.js";


const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// ── Chunk helpers ─────────────────────────────────────────────────────────────

const CHUNK_SIZE = 1000;
const CHUNK_COUNT = 20;   // chunks 0, 1000, …, 19000

function chunkIdFor(cardId) {
  return Math.floor(Number(cardId) / CHUNK_SIZE) * CHUNK_SIZE;
}

function chunkRef(username, cardId) {
  return doc(db, "users", username, "card_chunks", String(chunkIdFor(cardId)));
}

/** Lit le chunk d'une carte ; retourne l'objet { cardId: data } du chunk. */
async function getChunkCards(username, cardId) {
  const snap = await getDoc(chunkRef(username, cardId));
  return snap.exists() ? (snap.data().cards ?? {}) : {};
}

/** Lit les données d'une seule carte depuis son chunk. */
async function getCard(username, cardId) {
  const cards = await getChunkCards(username, cardId);
  return cards[String(cardId)] ?? null;
}

/**
 * Merge-écrit des champs dans une carte.
 * Firestore supporte la dot-notation pour les champs imbriqués :
 *   fields = { "reading.srs_level": 2, "known": true }
 * → updateDoc(chunkRef, { "cards.42.reading.srs_level": 2, "cards.42.known": true })
 *
 * Pour les champs qui nécessitent increment() on passe la valeur Firestore
 * sentinel directement dans fields.
 */
async function patchCard(username, cardId, fields) {
  const ref = chunkRef(username, cardId);
  const dotted = {};
  for (const [key, val] of Object.entries(fields)) {
    dotted[`cards.${cardId}.${key}`] = val;
  }
  // updateDoc supporte la dot-notation pour les champs imbriqués.
  // Si le chunk n'existe pas encore, on le crée d'abord avec setDoc puis on retente.
  try {
    await updateDoc(ref, dotted);
  } catch (err) {
    if (err.code === "not-found") {
      await setDoc(ref, { cards: {} });
      await updateDoc(ref, dotted);
    } else {
      throw err;
    }
  }
}


// ── User ──────────────────────────────────────────────────────────────────────

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

  const userSnap = await getDoc(doc(db, "users", username));
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();
  userData.cards = await fetchUserCards();
  return userData;
}

/** Charge les 20 chunks en parallèle → retourne toutes les cartes à plat. */
export async function fetchUserCards() {
  const username = getCurrentUser();
  if (!username) return null;

  const chunkIds = Array.from({ length: CHUNK_COUNT }, (_, i) => i * CHUNK_SIZE);
  const chunks = await Promise.all(
    chunkIds.map(id =>
      getDoc(doc(db, "users", username, "card_chunks", String(id)))
        .then(s => (s.exists() ? s.data().cards ?? {} : {}))
    )
  );

  const cards = Object.assign({}, ...chunks);
  return Object.keys(cards).length > 0 ? cards : null;
}


// ── Streak ────────────────────────────────────────────────────────────────────

export async function fetchStreakData() {
  const username = getCurrentUser();
  if (!username) return null;
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? (snap.data().streak ?? {}) : null;
}

export async function fetchCardOccurrences(wordId) {
  const username = getCurrentUser();
  if (!username) return [];
  const card = await getCard(username, wordId);
  return card?.occurrences ?? [];
}


// ── Card known ────────────────────────────────────────────────────────────────

export async function setCardKnown(wordId) {
  const username = getCurrentUser();
  if (!username) return;
  await patchCard(username, wordId, { known: true });
}

export async function setCardUnknown(wordId) {
  const username = getCurrentUser();
  if (!username) return;
  await patchCard(username, wordId, { known: false });
}

export async function setCardsKnown(wordIds) {
  const username = getCurrentUser();
  if (!username) return;
  await Promise.all(wordIds.map(id => patchCard(username, id, { known: true })));
}


// ── Overrides / custom subjects ───────────────────────────────────────────────

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
  await updateDoc(doc(db, "users", username), { customCards: arrayUnion(newId) });
  return newId;
}

export async function fetchCustomSubjects() {
  const snap = await getDocs(collection(db, "custom_subjects"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}


// ── Card progress ─────────────────────────────────────────────────────────────

export async function updateCardProgress(q, isCorrect, mode) {
  const username = getCurrentUser();
  if (!username) return;

  const card = await getCard(username, q.id);
  const currentSRS = card?.[q.kind]?.srs_level ?? -1;
  const newSRS = isCorrect ? Math.min(currentSRS + 1, 5) : 0;
  const nextReview = isCorrect
    ? nextReviewDate(newSRS)
    : new Date().toISOString().split("T")[0];

  await patchCard(username, q.id, {
    [`${q.kind}.srs_level`]: newSRS,
    [`${q.kind}.next_review`]: nextReview,
    [`${q.kind}.attempts`]: increment(1),
    [`${q.kind}.correct`]: isCorrect ? increment(1) : increment(0),
  });

  if (isCorrect) {
    if (mode === "daily") await updateDailyProgress("new");
    if (mode === "reviews") await updateDailyProgress("reviews");
  }
}


// ── Level completion ──────────────────────────────────────────────────────────

export async function markLevelSuccess(levelKey) {
  const username = getCurrentUser();
  if (!username) return;
  await updateDoc(doc(db, "users", username), {
    [`levels.${levelKey}`]: arrayUnion(new Date().toISOString()),
  });
}


// ── Streak ────────────────────────────────────────────────────────────────────

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
  } catch (err) { console.error("incrementStreakNew:", err); }
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
  } catch (err) { console.error("incrementStreakReviews:", err); }
}


// ── Own texts ─────────────────────────────────────────────────────────────────

async function getOwnLevels(username) {
  const snap = await getDoc(doc(db, "users", username));
  return snap.exists() ? (snap.data().ownLevels ?? {}) : {};
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
    type: "text", vocabulary: analysis.encoded.vocabulary,
    kanji: analysis.encoded.kanji, rawText
  };
  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

export async function saveBulkOwnTexts(entries, folderName, path = []) {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");
  if (!parent[folderName]) parent[folderName] = { type: "folder", children: {} };
  const folder = parent[folderName].children;
  for (const { title, analysis, rawText } of entries) {
    folder[title] = {
      type: "text", vocabulary: analysis.encoded.vocabulary,
      kanji: analysis.encoded.kanji, rawText
    };
  }
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

export async function deleteOwnNode(path, name) {
  const username = getCurrentUser();
  if (!username) return;
  const root = await getOwnLevels(username);
  const parent = getNodeAtPath(root, path);
  if (!parent) throw new Error("invalid_path");
  delete parent[name];
  await updateDoc(doc(db, "users", username), { ownLevels: root });
}

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


// ── Multiplayer ───────────────────────────────────────────────────────────────

export async function setGameLevel(gameId, level) {
  await updateDoc(doc(db, "parties", gameId), { level });
}


// ── Card SRS ──────────────────────────────────────────────────────────────────

export async function updateCardSRS(subjectId, exercise, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;

  const card = await getCard(username, subjectId);
  const currentLevel = card?.[exercise]?.srs_level ?? 0;
  const newLevel = nextSRSLevel(currentLevel, isCorrect);
  const nextReview = nextReviewDate(newLevel);

  await patchCard(username, subjectId, {
    [`${exercise}.srs_level`]: newLevel,
    [`${exercise}.next_review`]: nextReview,
    [`${exercise}.attempts`]: increment(1),
    ...(isCorrect ? { [`${exercise}.correct`]: increment(1) } : {}),
  });
}

export async function skipDailyWord(subjectId) {
  const username = getCurrentUser();
  if (!username) return;
  await patchCard(username, subjectId, {
    known: true,
    "reading.srs_level": 8,
    "reading.next_review": deleteField(),
  });
}


// ── Daily reviews ─────────────────────────────────────────────────────────────

export async function initDailyReviews(reviewIds) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.reviews_list`]: reviewIds,
    [`streak.${today}.reviews_total`]: reviewIds.length,
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
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  const field = type === "new" ? "new_done" : "reviews_done";
  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.${field}`]: increment(1),
  });
}

export async function initDailyReviewsIfNeeded(userData) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();

  if (userData?.streak?.[today]?.reviews_list !== undefined) return;

  const allSubjects = window.ALL_SUBJECTS ?? {};
  const { getReviewsDue } = await import("../utils/dailyWords.js");
  const due = getReviewsDue(userData, allSubjects);
  const ids = due.map(d => `${d.id}_${d.exercise}_old`);

  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.reviews_list`]: ids,
    [`streak.${today}.old_reviews_number`]: ids.length,
    [`streak.${today}.all_reviews_number`]: ids.length,
  });
}

export async function recordNewWordDone(subjectId, exercise) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();

  await patchCard(username, subjectId, {
    [`${exercise}.srs_level`]: 0,
    [`${exercise}.next_review`]: today,
  });

  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.discover_new`]: increment(1),
    [`streak.${today}.reviews_list`]: arrayUnion(`${subjectId}_${exercise}_new`),
    [`streak.${today}.new_reviews_number`]: increment(1),
    [`streak.${today}.all_reviews_number`]: increment(1),
  });
}

export async function getSRS(wordId) {
  const username = getCurrentUser();
  if (!username) return null;

  const card = await getCard(username, wordId);
  if (!card) return null;

  const reading = card?.reading?.srs_level ?? null;
  const meaning = card?.meaning?.srs_level ?? null;
  const reverse = card?.reverse?.srs_level ?? null;
  if (reading === null && meaning === null && reverse === null) return null;
  return Math.max(reading, meaning, reverse);
}

export async function recordReviewCorrect(subjectId, exercise, currentSRSLevel, isNew) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();
  const newSRS = Math.min(currentSRSLevel + 1, 5);
  const suffix = isNew ? "_new" : "_old";
  const doneField = isNew ? "new_reviews_done" : "old_reviews_done";

  await patchCard(username, subjectId, {
    [`${exercise}.srs_level`]: newSRS,
    [`${exercise}.next_review`]: nextReviewDate(newSRS),
    [`${exercise}.attempts`]: increment(1),
    [`${exercise}.correct`]: increment(1),
  });

  await updateDoc(doc(db, "users", username), {
    [`streak.${today}.${doneField}`]: increment(1),
    [`streak.${today}.reviews_list`]: arrayRemove(`${subjectId}_${exercise}${suffix}`),
  });
}

export async function recordReviewWrong(subjectId, exercise) {
  const username = getCurrentUser();
  if (!username) return;
  const today = getTodayLocal();

  await patchCard(username, subjectId, {
    [`${exercise}.srs_level`]: 0,
    [`${exercise}.next_review`]: today,
    [`${exercise}.attempts`]: increment(1),
  });
}

export async function recordCardAttempt(subjectId, exercise, isCorrect) {
  const username = getCurrentUser();
  if (!username) return;

  await patchCard(username, subjectId, {
    [`${exercise}.attempts`]: increment(1),
    [`${exercise}.correct`]: isCorrect ? increment(1) : increment(0),
  });
}