// =========================================================
// QUIZ-BUILDER — construction et priorisation des questions
// =========================================================

import { dbGet, currentUser } from "../index/db.js";

// ----------------------------------------------------------
// Spaced repetition
// ----------------------------------------------------------

/**
 * Calcule un score de priorité pour une carte (spaced repetition).
 * Score élevé = carte à revoir en priorité.
 * @param {{ attempts: number, correct: number }} card
 * @returns {number}
 */
export function getSpacedRepetitionScore(card) {
  const attempts = card.attempts || 0;
  const correct  = card.correct  || 0;

  if (attempts === 0) return 10000; // Jamais vue → priorité maximale

  const successRate = correct / attempts;

  let interval;
  if      (successRate >= 0.9) interval = 7; // 1 semaine
  else if (successRate >= 0.7) interval = 3; // 3 jours
  else if (successRate >= 0.5) interval = 1; // 1 jour
  else                         interval = 0; // aujourd'hui

  return 100 - interval * 10 + (1 - successRate) * 50;
}

/**
 * Trie un tableau de cartes par score de révision décroissant.
 * @param {Object[]} cards
 * @returns {Object[]} tableau trié (même référence)
 */
export function prioritizeQuestions(cards) {
  return cards.sort(
    (a, b) => getSpacedRepetitionScore(b) - getSpacedRepetitionScore(a)
  );
}

// ----------------------------------------------------------
// Construction des questions
// ----------------------------------------------------------

/**
 * Construit les objets Question depuis une liste d'IDs.
 *
 * @param {string[]} ids           IDs des sujets dans ALL_SUBJECTS
 * @param {string}   exercise      "meaning" | "reading" | "reverse"
 * @returns {Promise<Object[]>}
 */
export async function buildQuestions(ids, exercise) {
  const username = currentUser() || "guest";
  const userSnap = await dbGet(`users/${username}`);
  const cardsData = userSnap.data()?.cards ?? {};

  const questions = [];

  for (const id of ids) {
    const item = window.ALL_SUBJECTS[id];
    if (!item) continue;

    const q = buildQuestionFromItem(item, exercise);
    if (!q) continue;

    applyCardStats(q, cardsData);

    if (q.answers.length > 0 && q.prompt) {
      questions.push(q);
    }
  }

  return questions;
}

/**
 * Construit un objet Question depuis un item ALL_SUBJECTS.
 * @param {Object} item
 * @param {string} exercise
 * @returns {Object|null}
 */
function buildQuestionFromItem(item, exercise) {
  const base = {
    id:               item.id,
    object:           item.object,
    kind:             exercise,
    prompt:           null,
    answers:          [],
    readings:         item.readings         || [],
    meanings:         item.meanings         || [],
    examples:         item.examples         || [],
    meaning_mnemonic: item.meaning_mnemonic || "",
    reading_mnemonic: item.reading_mnemonic || "",
    part_of_speech:   item.part_of_speech   || "",
    vocab_to_kanji_info: item.vocab_to_kanji_info || [],
    kanji_to_vocab_info: item.kanji_to_vocab_info || [],
    attempts: 0,
    correct:  0,
  };

  if (item.object === "radical") {
    base.prompt  = item.characters;
    base.answers = item.meanings;
    return base;
  }

  if (item.object === "kanji" || item.object === "vocabulary" || item.object === "kana_vocabulary") {
    if (exercise === "meaning") {
      base.prompt  = item.characters;
      base.answers = item.meanings;
    } else if (exercise === "reading") {
      base.prompt  = item.characters;
      base.answers = item.readings;
    } else if (exercise === "reverse") {
      base.prompt  = item.meanings.join(", ");
      base.answers = [item.characters];
    }
    return base;
  }

  return null;
}

/**
 * Copie les stats (attempts/correct) depuis cardsData dans la question.
 * @param {Object} q
 * @param {Object} cardsData
 */
function applyCardStats(q, cardsData) {
  const key = `${q.id}-${q.kind}`;
  if (cardsData[key]) {
    q.attempts = cardsData[key].attempts || 0;
    q.correct  = cardsData[key].correct  || 0;
  }
}
