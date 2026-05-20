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
  //si ça contient des tildes, les enlever (ex: "～する" → "する")
  //si ça contient des ; on considère que ce qu'il y a avant
  //
  str = str.replace(/^～+/, '');
  str = str.split(';')[0];
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

const QWERTY_ADJACENT = {
  q: ['w', 'a'], w: ['q', 'e', 'a', 's'], e: ['w', 'r', 's', 'd'], r: ['e', 't', 'd', 'f'],
  t: ['r', 'y', 'f', 'g'], y: ['t', 'u', 'g', 'h'], u: ['y', 'i', 'h', 'j'], i: ['u', 'o', 'j', 'k'],
  o: ['i', 'p', 'k', 'l'], p: ['o', 'l'],
  a: ['q', 'w', 's', 'z'], s: ['a', 'w', 'e', 'd', 'z', 'x'], d: ['s', 'e', 'r', 'f', 'x', 'c'],
  f: ['d', 'r', 't', 'g', 'c', 'v'], g: ['f', 't', 'y', 'h', 'v', 'b'], h: ['g', 'y', 'u', 'j', 'b', 'n'],
  j: ['h', 'u', 'i', 'k', 'n', 'm'], k: ['j', 'i', 'o', 'l', 'm'], l: ['k', 'o', 'p'],
  z: ['a', 's', 'x'], x: ['z', 's', 'd', 'c'], c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'], b: ['v', 'g', 'h', 'n'], n: ['b', 'h', 'j', 'm'], m: ['n', 'j', 'k'],
};

function subCost(a, b) {
  if (a === b) return 0;
  return QWERTY_ADJACENT[a]?.includes(b) ? 0.5 : 1;
}

function maxTypos(len) {
  if (len <= 3) return 0;
  if (len <= 7) return 1;
  if (len <= 12) return 2;
  return 3;
}

export function isCloseEnough(a, b) {
  if (a === b) return true;

  const m = a.length, n = b.length;
  const threshold = maxTypos(Math.max(m, n));

  if (Math.abs(m - n) > threshold + 1) return false;

  // Damerau-Levenshtein avec :
  // - transposition = coût 0
  // - substitution touche adjacente = coût 0.5
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : Infinity))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,                        // suppression
        dp[i][j - 1] + 1,                        // insertion
        dp[i - 1][j - 1] + subCost(a[i - 1], b[j - 1]) // substitution
      );
      // Transposition : coût 0
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2]);
      }
    }
  }

  console.log(`Distance between "${a}" and "${b}":`, dp[m][n]);
  return dp[m][n] <= threshold;
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

  const toHira = str =>
    str.split("").map(c => allToHiraganaMap[c] || c).join("");

  //si y a un suru de difference à la fin, pas grave

  console.log(`Comparing "${a}" and "${b}" as kana:`, toHira(a), toHira(b), a.endsWith("する"), b.endsWith("する"), toHira(a.slice(0, -2)), toHira(b.slice(0, -2)));
  if (a.endsWith("する") && toHira(a.slice(0, -2)) === toHira(b)) return true;
  if (b.endsWith("する") && toHira(b.slice(0, -2)) === toHira(a)) return true;

  return toHira(a) === toHira(b);
}

/**
 * Retourne la date locale du jour au format YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
