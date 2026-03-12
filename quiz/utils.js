// =========================================================
// UTILS — fonctions pures utilitaires
// Aucun effet de bord, aucune dépendance DOM ou Firebase.
// =========================================================

/**
 * Mélange un tableau en place (Fisher-Yates approximatif).
 * @param {Array} array
 * @returns {Array} le même tableau mélangé
 */
export function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

/**
 * Normalise une chaîne : trim + lowercase.
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
  return str.trim().toLowerCase();
}

/**
 * Supprime les balises HTML d'une chaîne.
 * @param {string} text
 * @returns {string}
 */
export function cleanText(text) {
  if (typeof text !== "string") return text;
  return text.replace(/<[^>]*>/g, "");
}

/**
 * Entoure chaque occurrence de `word` dans `sentence` par <strong>.
 * @param {string} sentence
 * @param {string} word
 * @returns {string}
 */
export function highlightWord(sentence, word) {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  return sentence.replace(regex, `<strong>${word}</strong>`);
}

/**
 * Vérifie si deux chaînes sont identiques à 1 caractère près
 * (distance de Levenshtein ≤ 1).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isCloseEnough(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  let diff = 0, i = 0, j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      diff++;
      if (diff > 1) return false;
      if      (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else { i++; j++; }
    } else {
      i++; j++;
    }
  }

  return true;
}

/**
 * Compare deux chaînes en ignorant la différence hiragana/katakana.
 * @param {string} a
 * @param {string} b
 * @param {Object} allToHiraganaMap  map de conversion vers hiragana
 * @returns {boolean}
 */
export function regardlessKana(a, b, allToHiraganaMap) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  const toHira = str =>
    str.split("").map(c => allToHiraganaMap[c] || c).join("");

  return toHira(a) === toHira(b);
}

/**
 * Retourne la date locale du jour au format YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayLocal() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
