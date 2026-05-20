// =========================================================
// JAPANESE — chargement des maps + conversion romaji/kana/kanji
//            + UI des suggestions kanji
// =========================================================

import { quizState } from "./state.js";
import { input, suggestionsEl } from "./dom.js";
import { sentenceToHiragana } from "../index/analyzer.js";
// ----------------------------------------------------------
// Maps de conversion (chargées au démarrage)
// ----------------------------------------------------------
export const maps = {
  romajiToKana: {},   // "ka" → "か"
  kanaToKanji: {},   // "かわ" → ["川", "河", …]
  allToHiragana: {},   // katakana → hiragana
};

/**
 * Charge les trois fichiers JSON de conversion.
 * Doit être appelé avant toute conversion.
 * @returns {Promise<void>}
 */
export async function loadJapaneseMaps() {
  const BASE = new URL("../data/", import.meta.url).href;
  // puis
  fetch(`${BASE}romaji_to_kana.json`)
  const [romajiMap, kanjiMap, hiraganaMap] = await Promise.all([
    fetch(`${BASE}romaji_to_kana.json`).then(r => r.json()),
    fetch(`${BASE}reading_to_kanji.json`).then(r => r.json()),
    fetch(`${BASE}all_to_hiragana.json`).then(r => r.json()),
  ]);
  maps.romajiToKana = romajiMap;
  maps.kanaToKanji = kanjiMap;
  maps.allToHiragana = hiraganaMap;
}

// ----------------------------------------------------------
// Conversion romaji → kana
// ----------------------------------------------------------

const LATIN_LETTERS = "azertyuiopqsdfghjklmwxcvbn";

/**
 * Convertit une chaîne romaji en kana hiragana.
 * @param {string} str
 * @returns {string}
 */
export function romajiToKana(str) {
  let result = "";
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    // Caractère non-latin → copié tel quel
    if (!LATIN_LETTERS.includes(ch)) {
      result += ch;
      i++;
      continue;
    }

    // "nn" → ん
    if (ch === "n" && str[i + 1] === "n") {
      result += "ん";
      i += 2;
      continue;
    }

    // "n" suivi d'une consonne → ん
    if (ch === "n" && i + 1 < str.length && !"aeiouy".includes(str[i + 1])) {
      result += "ん";
      i++;
      continue;
    }

    // Consonne doublée → っ
    if (str[i + 1] === ch && !"aeiouyn".includes(ch)) {
      result += "っ";
      i++;
      continue;
    }

    // Lookup de 1 à 3 caractères dans la map
    let matched = false;
    for (let len = 2; len >= 0; len--) {
      const slice = str.slice(i, i + len + 1);
      if (maps.romajiToKana[slice]) {
        result += maps.romajiToKana[slice];
        i += len + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += ch;
      i++;
    }
  }

  return result;
}

/**
 * Retourne les kanjis correspondant à une lecture kana.
 * @param {string} kana
 * @returns {string[]}
 */
export function kanaToKanji(kana) {
  return maps.kanaToKanji[kana] ?? [];
}

// ----------------------------------------------------------
// UI des suggestions kanji (mode reverse)
// ----------------------------------------------------------

/**
 * Affiche la liste de suggestions sous le champ de saisie.
 * @param {string[]} kanjis
 */
export function showKanjiSuggestions(kanjis) {
  suggestionsEl.innerHTML = "";
  quizState.currentSuggestions = kanjis;

  if (!kanjis.length) {
    hideKanjiSuggestions();
    return;
  }

  quizState.suggestionIndex = 0;
  renderKanjiSelection();

  kanjis.forEach((k, i) => {
    const div = document.createElement("div");
    div.className = "kanji-option";
    div.textContent = k;
    if (i === 0) div.classList.add("selected");

    div.addEventListener("click", () => {
      input.value = k;
      hideKanjiSuggestions();
    });

    suggestionsEl.appendChild(div);
  });

  suggestionsEl.classList.remove("hidden");
}

/**
 * Masque et réinitialise les suggestions kanji.
 */
export function hideKanjiSuggestions() {
  suggestionsEl.classList.add("hidden");
  quizState.suggestionIndex = -1;
  quizState.currentSuggestions = [];
}

/**
 * Met à jour la mise en évidence de l'élément sélectionné.
 */
export function renderKanjiSelection() {
  [...suggestionsEl.children].forEach((el, i) => {
    const isSelected = i === quizState.suggestionIndex;
    el.classList.toggle("selected", isSelected);
    if (isSelected) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

/**
 * Déplace la sélection vers le bas dans les suggestions.
 */
export function selectNextSuggestion() {
  const len = quizState.currentSuggestions.length;
  if (!len) return;
  quizState.suggestionIndex = (quizState.suggestionIndex + 1) % len;
  renderKanjiSelection();
}

/**
 * Déplace la sélection vers le haut dans les suggestions.
 */
export function selectPrevSuggestion() {
  const len = quizState.currentSuggestions.length;
  if (!len) return;
  quizState.suggestionIndex = (quizState.suggestionIndex - 1 + len) % len;
  renderKanjiSelection();
}


const KANJI_RE = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const HARD_JLPT = new Set(["N0", "N1"]);

export function getHardKanjiReadings(vocabItem, allSubjects) {
  const chars = [...(vocabItem.prompt ?? "")];
  const vocabReadings = vocabItem.readings ?? [];

  console.log(`[furigana] mot: "${vocabItem.prompt}" | lectures: ${JSON.stringify(vocabReadings)}`);

  const charToKanji = new Map();

  for (const id of (vocabItem.vocab_to_kanji ?? [])) {
    const s = allSubjects[id];
    if (s?.characters) charToKanji.set(s.characters, s);
  }

  for (const char of chars) {
    if (KANJI_RE.test(char) && !charToKanji.has(char)) {
      const found = Object.values(allSubjects).find(
        s => s.object === "kanji" && s.characters === char
      );
      if (found) charToKanji.set(char, found);
    }
  }

  console.log(`[furigana] kanji trouvés:`, [...charToKanji.entries()].map(([c, s]) => `${c}(jlpt:${s.jlpt}, readings:${s.readings})`));

  for (const vocabReading of vocabReadings) {
    const result = greedyMatch(chars, vocabReading, charToKanji);
    console.log(`[furigana] essai lecture "${vocabReading}" →`, result);
    if (result !== null) return result;
  }

  console.log(`[furigana] aucune lecture n'a matché`);
  return [];
}

function greedyMatch(chars, reading, charToKanji) {
  let remaining = reading;
  const matches = [];

  for (const char of chars) {
    if (!remaining) {
      console.log(`[furigana]   lecture épuisée avant la fin du mot sur char "${char}"`);
      return null;
    }

    if (!KANJI_RE.test(char)) {
      if (!remaining.startsWith(char)) {
        console.log(`[furigana]   kana "${char}" ne matche pas le début de "${remaining}"`);
        return null;
      }
      remaining = remaining.slice(char.length);
      continue;
    }

    const kanji = charToKanji.get(char);
    if (!kanji) {
      console.log(`[furigana]   kanji "${char}" introuvable dans charToKanji`);
      return null;
    }

    const readings = [...(kanji.readings ?? [])].sort((a, b) => b.length - a.length);

    let matched = null;
    let matchedVariant = null;

    for (const r of readings) {
      const variant = expandReading(r).find(v => remaining.startsWith(v));
      if (variant) {
        matched = r;
        matchedVariant = variant;
        break;
      }
    }

    if (!matchedVariant) {
      console.log(`[furigana]   kanji "${char}" — aucune lecture parmi [${kanji.readings}] ne matche "${remaining}"`);
      return null;
    }

    console.log(`[furigana]   kanji "${char}" → lecture "${matchedVariant}" (jlpt: ${kanji.jlpt})`);

    if (HARD_JLPT.has(kanji.jlpt)) {
      matches.push({ kanji: char, reading: matchedVariant });
    }

    remaining = remaining.slice(matchedVariant.length);
  }

  return matches;
}

export function renderWithFurigana(characters, kanjiReadings) {
  if (!kanjiReadings.length) return characters;

  const readingMap = new Map(
    [...kanjiReadings].reverse().map(({ kanji, reading }) => [kanji, reading])
  );

  return [...characters]
    .map(char =>
      readingMap.has(char)
        ? `<ruby>${char}<rt>${readingMap.get(char)}</rt></ruby>`
        : char
    )
    .join("");
}

export function compareTitles(a, b) {
  const isLatin = t => /^[a-zA-Z0-9]/.test(t);
  if (isLatin(a) && !isLatin(b)) return -1;
  if (!isLatin(a) && isLatin(b)) return 1;
  if (isLatin(a) && isLatin(b)) return a.toLowerCase().localeCompare(b.toLowerCase());
  return sentenceToHiragana(a).localeCompare(sentenceToHiragana(b), "ja");
}


function expandReading(reading) {
  const variants = new Set([reading]);

  const dakuten = {
    "か": "が", "き": "ぎ", "く": "ぐ", "け": "げ", "こ": "ご",
    "さ": "ざ", "し": "じ", "す": "ず", "せ": "ぜ", "そ": "ぞ",
    "た": "だ", "ち": "ぢ", "つ": "づ", "て": "で", "と": "ど",
    "は": "ば", "ひ": "び", "ふ": "ぶ", "へ": "べ", "ほ": "ぼ",
  };
  const handakuten = {
    "は": "ぱ", "ひ": "ぴ", "ふ": "ぷ", "へ": "ぺ", "ほ": "ぽ",
  };

  const first = reading[0];
  if (dakuten[first]) variants.add(dakuten[first] + reading.slice(1));
  if (handakuten[first]) variants.add(handakuten[first] + reading.slice(1));

  variants.add("っ" + reading);

  const last = reading[reading.length - 1];
  const smallTsuFrom = { "く": "っ", "き": "っ", "つ": "っ", "ち": "っ", "す": "っ", "し": "っ", "ぷ": "っ", "ぱ": "っ" };
  if (smallTsuFrom[last]) {
    variants.add(reading.slice(0, -1) + smallTsuFrom[last]);
  }

  return [...variants];
}