
// =========================================================
// FONCTIONS UTILITAIRES
// =========================================================

/**
 * Mélange aléatoirement un tableau
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} Le même tableau mélangé
 */
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

/**
 * Normalise une chaîne pour la comparaison
 * (enlève les espaces et met en minuscules)
 * @param {string} str - Chaîne à normaliser
 * @returns {string} Chaîne normalisée
 */
function normalize(str) {
  return str.trim().toLowerCase();
}

/**
 * Met en surbrillance un mot dans une phrase
 * @param {string} sentence - La phrase complète
 * @param {string} word - Le mot à mettre en surbrillance
 * @returns {string} HTML avec le mot surligné
 */
function highlightWord(sentence, word) {
  if (!sentence || !word) return sentence;

  // Échappe les caractères spéciaux pour la regex
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");

  return sentence.replace(regex, `<strong>${word}</strong>`);
}

/**
 * Supprime les balises <radical>, <kanji>, <vocabulary>, <kana-vocabulary>
 * tout en conservant le texte interne
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  if (typeof text !== "string") return text;

  return text.replace(/<[^>]*>/g, "");
}


function isCloseEnough(a, b) {
  if (a === b) return true;

  // trop différent → non
  if (Math.abs(a.length - b.length) > 1) return false;

  let diff = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      diff++;
      if (diff > 1) return false;

      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else {
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }

  return true;
}

