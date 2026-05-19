// ============================================================
//  analyzer.js  —  Japanese text analysis
//  Loads dictionaries once, exposes analyzeLyrics().
// ============================================================

const MIN_NORMALIZE_LENGTH = 2;

let KANJI_TO_WANIKANI = {};
let KANJI_TO_ID = {};
let VOCAB_TO_ID = {};
let loaded = false;

const BASE = new URL("../data/", import.meta.url).href;

export async function loadDictionary() {
  if (loaded) return;
  const [r1, r2, r3] = await Promise.all([
    fetch(`${BASE}kanji_to_wanikani.json`),
    fetch(`${BASE}kanji_to_id.json`),
    fetch(`${BASE}vocab_to_id.json`),
  ]);
  KANJI_TO_WANIKANI = await r1.json();
  KANJI_TO_ID = await r2.json();
  VOCAB_TO_ID = await r3.json();
  loaded = true;
}

// Splits a Japanese text into sentences on punctuation and line breaks.
export function splitSentences(text) {
  return text
    .split(/(?<=[。！？!?\n])|(?=\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Returns the dictionary form of a conjugated word, or null.
function normalizeToDict(word) {
  const candidates = [];
  const hasKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(word);

  // ── I-adjectives ──────────────────────────────────────────
  const iAdj = [
    ["く", "い"], ["くて", "い"], ["くない", "い"],
    ["くなかった", "い"], ["かった", "い"], ["かったです", "い"],
    ["くなる", "い"], ["くなった", "い"], ["ければ", "い"],
    ["くも", "い"], ["さ", "い"], ["そう", "い"],
    ["すぎる", "い"], ["です", "い"],
  ];
  for (const [suffix, base] of iAdj) {
    if (word.endsWith(suffix)) candidates.push(word.slice(0, -suffix.length) + base);
  }

  // ── Na-adjectives ─────────────────────────────────────────
  const naAdj = [
    ["な", ""], ["に", ""], ["で", ""],
    ["じゃない", ""], ["ではない", ""], ["じゃなかった", ""], ["ではなかった", ""],
    ["だった", ""], ["でした", ""], ["そう", ""], ["すぎる", ""],
  ];
  for (const [suffix, base] of naAdj) {
    if (word.endsWith(suffix) && word.length > suffix.length)
      candidates.push(word.slice(0, -suffix.length) + base);
  }

  if (hasKanji || word.length >= 3) {
    // ── Irregular verbs ───────────────────────────────────────
    const irregulars = {
      "する": "する", "して": "する", "した": "する", "しない": "する", "しなかった": "する",
      "します": "する", "しました": "する", "しません": "する", "しませんでした": "する",
      "しろ": "する", "するな": "する", "しなければ": "する", "すれば": "する",
      "しても": "する", "したら": "する", "できる": "する", "できた": "する", "できない": "する",
      "させる": "する", "させた": "する", "させない": "する", "される": "する", "された": "する", "されない": "する",
      "くる": "くる", "きて": "くる", "きた": "くる", "こない": "くる", "こなかった": "くる",
      "きます": "くる", "きました": "くる", "きません": "くる", "こい": "くる",
      "くれば": "くる", "きても": "くる", "きたら": "くる", "こさせる": "くる", "こられる": "くる",
      "来る": "来る", "来て": "来る", "来た": "来る", "来ない": "来る", "来ます": "来る", "来い": "来る",
    };
    if (irregulars[word]) candidates.push(irregulars[word]);

    // ── Ichidan verbs ─────────────────────────────────────────
    const ichidan = [
      "て", "た", "ない", "なかった", "ます", "ました", "ません", "ませんでした",
      "られる", "られた", "られない", "させる", "させた", "させない", "させられる",
      "れば", "たら", "ても", "ろ", "よ", "よう", "ながら", "そう", "すぎる",
    ];
    for (const suffix of ichidan) {
      if (word.endsWith(suffix)) candidates.push(word.slice(0, -suffix.length) + "る");
    }

    // ── Godan verbs ───────────────────────────────────────────
    const godan = [
      ["って", "う"], ["った", "う"], ["いて", "く"], ["いた", "く"], ["いで", "ぐ"], ["いだ", "ぐ"],
      ["して", "す"], ["した", "す"], ["んで", "ぬ"], ["んだ", "ぬ"], ["んで", "む"], ["んだ", "む"],
      ["んで", "ぶ"], ["んだ", "ぶ"], ["って", "つ"], ["った", "つ"], ["って", "る"], ["った", "る"],
      ["わない", "う"], ["かない", "く"], ["がない", "ぐ"], ["さない", "す"], ["なない", "ぬ"],
      ["まない", "む"], ["ばない", "ぶ"], ["たない", "つ"], ["らない", "る"],
      ["わなかった", "う"], ["かなかった", "く"], ["がなかった", "ぐ"], ["さなかった", "す"],
      ["まなかった", "む"], ["ばなかった", "ぶ"], ["たなかった", "つ"], ["らなかった", "る"],
      ["い", "う"], ["き", "く"], ["ぎ", "ぐ"], ["し", "す"], ["に", "ぬ"], ["み", "む"],
      ["び", "ぶ"], ["ち", "つ"], ["り", "る"],
      ["います", "う"], ["きます", "く"], ["ぎます", "ぐ"], ["します", "す"], ["にます", "ぬ"],
      ["みます", "む"], ["びます", "ぶ"], ["ちます", "つ"], ["ります", "る"],
      ["いました", "う"], ["きました", "く"], ["いません", "う"], ["きません", "く"],
      ["える", "う"], ["ける", "く"], ["げる", "ぐ"], ["せる", "す"], ["ねる", "ぬ"],
      ["める", "む"], ["べる", "ぶ"], ["てる", "つ"], ["れる", "る"],
      ["われる", "う"], ["かれる", "く"], ["がれる", "ぐ"], ["される", "す"], ["なれる", "ぬ"],
      ["まれる", "む"], ["ばれる", "ぶ"], ["たれる", "つ"], ["られる", "る"],
      ["わせる", "う"], ["かせる", "く"], ["がせる", "ぐ"], ["させる", "す"], ["なせる", "ぬ"],
      ["ませる", "む"], ["ばせる", "ぶ"], ["たせる", "つ"], ["らせる", "る"],
      ["えば", "う"], ["けば", "く"], ["げば", "ぐ"], ["せば", "す"], ["ねば", "ぬ"],
      ["めば", "む"], ["べば", "ぶ"], ["てば", "つ"], ["れば", "る"],
      ["おう", "う"], ["こう", "く"], ["ごう", "ぐ"], ["そう", "す"], ["のう", "ぬ"],
      ["もう", "む"], ["ぼう", "ぶ"], ["とう", "つ"], ["ろう", "る"],
      ["え", "う"], ["け", "く"], ["げ", "ぐ"], ["せ", "す"], ["ね", "ぬ"],
      ["め", "む"], ["べ", "ぶ"], ["て", "つ"], ["れ", "る"],
      ["ったら", "う"], ["いたら", "く"], ["いだら", "ぐ"], ["したら", "す"],
      ["んだら", "む"], ["んだら", "ぶ"], ["ったら", "つ"], ["ったら", "る"],
      ["っても", "う"], ["いても", "く"], ["いでも", "ぐ"], ["しても", "す"],
      ["んでも", "む"], ["んでも", "ぶ"], ["っても", "つ"], ["っても", "る"],
      ["いながら", "く"], ["ちながら", "つ"], ["りながら", "る"],
      ["みながら", "む"], ["びながら", "ぶ"], ["しながら", "す"],
      ["いすぎる", "く"], ["りすぎる", "る"], ["みすぎる", "む"],
      ["いすぎる", "う"], ["しすぎる", "す"],
    ];
    for (const [suffix, base] of godan) {
      if (word.endsWith(suffix)) candidates.push(word.slice(0, -suffix.length) + base);
    }
  }

  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    if (KANJI_TO_WANIKANI[c]) return c;
  }
  return null;
}

// Analyzes a single sentence, returns matched vocab norms and kanji chars found.
function analyzeSentence(sentence) {
  const foundVocab = []; // [{ norm, id }]
  const foundKanji = []; // [{ char, id }]

  let i = 0;
  while (i < sentence.length) {
    let bestMatch = null;
    let bestLength = 0;
    let bestNorm = null;

    for (let j = i + 1; j <= sentence.length; j++) {
      const sub = sentence.slice(i, j);

      if (KANJI_TO_WANIKANI[sub]) {
        bestMatch = sub; bestLength = j - i; bestNorm = sub;
        continue;
      }
      if (sub.length >= MIN_NORMALIZE_LENGTH) {
        const norm = normalizeToDict(sub);
        if (norm && KANJI_TO_WANIKANI[norm]) {
          bestMatch = sub; bestLength = j - i; bestNorm = norm;
        }
      }
    }

    if (bestMatch) {
      const isInWanikani = KANJI_TO_WANIKANI[bestNorm]?.includes(bestNorm);
      if (isInWanikani && VOCAB_TO_ID[bestNorm]) {
        foundVocab.push({ norm: bestNorm, id: VOCAB_TO_ID[bestNorm][0] });
      }
      i += bestLength;
    } else {
      i++;
    }
  }

  for (const char of sentence) {
    if (KANJI_TO_ID[char]) {
      foundKanji.push({ char, id: KANJI_TO_ID[char][0] });
    }
  }

  return { foundVocab, foundKanji };
}

// ── Main export ───────────────────────────────────────────────────────────────
//
//  analyzeLyrics(text, sourceLabel)
//
//  Returns:
//  {
//    // For ownLevels — plain id lists (unchanged format)
//    ids: {
//      vocabulary: [123, 456],
//      kanji:      [789],
//    },
//    // For cards — occurrences grouped by id
//    occurrences: {
//      "123": [{ sentence: "眼鏡を外してさ", source: "Plasticzooms" }],
//      "789": [{ sentence: "眼鏡を外してさ", source: "Plasticzooms" }],
//    }
//  }

export function analyzeLyrics(text, sourceLabel = "") {
  const vocabMap = new Map(); // norm → { id, indices: Set<number> }
  const kanjiMap = new Map(); // char → { id, indices: Set<number> }

  const sentences = splitSentences(text);

  for (let sentIdx = 0; sentIdx < sentences.length; sentIdx++) {
    const sentence = sentences[sentIdx];
    const { foundVocab, foundKanji } = analyzeSentence(sentence);

    for (const { norm, id } of foundVocab) {
      if (!vocabMap.has(norm)) vocabMap.set(norm, { id, indices: new Set() });
      vocabMap.get(norm).indices.add(sentIdx);
    }

    for (const { char, id } of foundKanji) {
      if (!kanjiMap.has(char)) kanjiMap.set(char, { id, indices: new Set() });
      kanjiMap.get(char).indices.add(sentIdx);
    }
  }

  // "id:0-2-5,id2:1" — indices des phrases où chaque mot apparaît
  const encodeMap = (map) =>
    [...map.values()]
      .map(({ id, indices }) => `${id}:${[...indices].join("-")}`)
      .join(",");

  // Liste d'ids dédupliquée (pour ownCards count)
  const vocabIds = [...new Set([...vocabMap.values()].map(v => v.id))];
  const kanjiIds = [...new Set([...kanjiMap.values()].map(v => v.id))];

  return {
    ids: { vocabulary: vocabIds, kanji: kanjiIds },
    encoded: {
      vocabulary: encodeMap(vocabMap),
      kanji: encodeMap(kanjiMap),
    },
  };
}


export function sentenceToHiragana(sentence) {
  let result = "";
  let i = 0;

  while (i < sentence.length) {
    let bestMatch = null;
    let bestLength = 0;
    let bestReading = null;

    for (let j = i + 1; j <= sentence.length; j++) {
      const sub = sentence.slice(i, j);

      // Cherche le mot tel quel dans le vocabulaire
      let norm = null;
      if (KANJI_TO_WANIKANI[sub]) {
        norm = sub;
      } else if (sub.length >= MIN_NORMALIZE_LENGTH) {
        const n = normalizeToDict(sub);
        if (n && KANJI_TO_WANIKANI[n]) norm = n;
      }

      if (norm && VOCAB_TO_ID[norm]) {
        const id = VOCAB_TO_ID[norm][0];
        const subject = window.ALL_SUBJECTS?.[id];
        if (subject?.readings?.[0]) {
          bestMatch = sub;
          bestLength = j - i;
          bestReading = subject.readings[0];
        }
      }
    }

    if (bestMatch && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(bestMatch)) {
      // Remplace uniquement si le mot contient au moins un kanji
      result += bestReading;
      i += bestLength;
    } else {
      result += sentence[i];
      i++;
    }
  }

  return result;
}