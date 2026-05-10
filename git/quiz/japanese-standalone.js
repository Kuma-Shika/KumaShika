// ============================================================
//  japanese-standalone.js  —  Romaji/kana conversion + maps
//  Identical logic to quiz/japanese.js but with zero imports
//  from dom.js or state.js. Safe to use from index/ modules.
// ============================================================

export const maps = {
  romajiToKana:  {},
  kanaToKanji:   {},
  allToHiragana: {},
};

let mapsLoaded = false;

export async function loadJapaneseMaps() {
  if (mapsLoaded) return;
  const [romajiMap, kanjiMap, hiraganaMap] = await Promise.all([
    fetch("assets/romaji_to_kana.json").then(r => r.json()),
    fetch("assets/reading_to_kanji.json").then(r => r.json()),
    fetch("assets/all_to_hiragana.json").then(r => r.json()),
  ]);
  maps.romajiToKana  = romajiMap;
  maps.kanaToKanji   = kanjiMap;
  maps.allToHiragana = hiraganaMap;
  mapsLoaded = true;
}

const LATIN_LETTERS = "azertyuiopqsdfghjklmwxcvbn";

export function romajiToKana(str) {
  let result = "";
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (!LATIN_LETTERS.includes(ch)) { result += ch; i++; continue; }

    if (ch === "n" && str[i + 1] === "n") { result += "ん"; i += 2; continue; }

    if (ch === "n" && i + 1 < str.length && !"aeiouy".includes(str[i + 1])) {
      result += "ん"; i++; continue;
    }

    if (str[i + 1] === ch && !"aeiouyn".includes(ch)) { result += "っ"; i++; continue; }

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

    if (!matched) { result += ch; i++; }
  }

  return result;
}

export function kanaToKanji(kana) {
  return maps.kanaToKanji[kana] ?? [];
}