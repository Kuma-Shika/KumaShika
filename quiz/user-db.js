// =========================================================
// USER-DB — persistance des données utilisateur dans Firestore
//   - progression des cartes (attempts / correct)
//   - niveaux complétés
//   - streak quotidien
// =========================================================

import { dbGet, dbSet, currentUser, arrayUnion } from "./firebase.js";
import { getTodayLocal } from "./utils.js";
import { urlParams }     from "./state.js";

// ----------------------------------------------------------
// Progression des cartes
// ----------------------------------------------------------

/**
 * Met à jour attempts et correct d'une carte après une réponse.
 * @param {Object}  q          Question
 * @param {boolean} isCorrect
 */
export async function updateCardProgress(q, isCorrect) {
  const username = currentUser();
  const snap = await dbGet(`users/${username}`);
  if (!snap.exists()) return;

  const cardsData = snap.data().cards ?? {};
  const key       = `${q.id}-${q.kind}`;

  if (cardsData[key]) {
    await dbSet(`users/${username}`, {
      [`cards.${key}.attempts`]: (cardsData[key].attempts || 0) + 1,
      [`cards.${key}.correct`]:  isCorrect
        ? (cardsData[key].correct || 0) + 1
        : (cardsData[key].correct || 0),
    });
  } else {
    await dbSet(`users/${username}`, {
      [`cards.${key}`]: { attempts: 1, correct: isCorrect ? 1 : 0 },
    });
  }
}

// ----------------------------------------------------------
// Niveaux complétés
// ----------------------------------------------------------

/**
 * Enregistre la complétion d'un niveau (ajoute un timestamp).
 * @param {string} level   ex: "3-2"
 */
export async function markLevelSuccess(level) {
  const username = currentUser();
  const snap = await dbGet(`users/${username}`);
  if (!snap.exists()) return;

  await dbSet(`users/${username}`, {
    [`levels.${level}`]: arrayUnion(new Date().toISOString()),
  });
}

// ----------------------------------------------------------
// Streak quotidien
// ----------------------------------------------------------

/**
 * Retourne les données de streak d'aujourd'hui.
 * Crée l'entrée si elle n'existe pas encore.
 * @returns {Promise<{ new: number, reviews: number }>}
 */
export async function getTodayStreak() {
  const username = currentUser();
  const snap     = await dbGet(`users/${username}`);

  if (!snap.exists()) throw new Error("Utilisateur introuvable");

  const userData = snap.data();
  const today    = getTodayLocal();

  if (!userData.streak) {
    await dbSet(`users/${username}`, {
      streak: { [today]: { new: 0, reviews: 0 } },
    });
    return { new: 0, reviews: 0 };
  }

  if (!userData.streak[today]) {
    await dbSet(`users/${username}`, {
      [`streak.${today}`]: { new: 0, reviews: 0 },
    });
    return { new: 0, reviews: 0 };
  }

  return userData.streak[today];
}

/**
 * Incrémente le compteur de nouvelles cartes du jour.
 * Ne fait rien si le niveau est déjà complété.
 */
export async function incrementStreakNew() {
  try {
    const username = currentUser();
    const snap     = await dbGet(`users/${username}`);
    const userData = snap.data();

    // Ne pas compter si le niveau est déjà validé
    if (userData?.levels?.[urlParams.level_all]) return;

    const today       = getTodayLocal();
    const todayStreak = await getTodayStreak();

    await dbSet(`users/${username}`, {
      [`streak.${today}.new`]: todayStreak.new + 1,
    });

    console.log(`✅ Streak New: ${todayStreak.new + 1}`);
  } catch (err) {
    console.error("Erreur incrementStreakNew:", err);
  }
}

/**
 * Incrémente le compteur de reviews du jour.
 */
export async function incrementStreakReviews() {
  try {
    const username    = currentUser();
    const today       = getTodayLocal();
    const todayStreak = await getTodayStreak();

    await dbSet(`users/${username}`, {
      [`streak.${today}.reviews`]: todayStreak.reviews + 1,
    });

    console.log(`✅ Streak Reviews: ${todayStreak.reviews + 1}`);
  } catch (err) {
    console.error("Erreur incrementStreakReviews:", err);
  }
}
