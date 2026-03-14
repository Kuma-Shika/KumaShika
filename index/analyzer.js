// ============================================================
//  analyzer.js  —  Japanese text analysis
//  Loads dictionaries once, exposes analyzeLyrics().
// ============================================================

const MIN_NORMALIZE_LENGTH = 2;

let KANJI_TO_WANIKANI = {};
let KANJI_TO_ID       = {};
let VOCAB_TO_ID       = {};
let loaded            = false;

export async function loadDictionary() {
  if (loaded) return;
  const [r1, r2, r3] = await Promise.all([
    fetch("../assets/kanji_to_wanikani.json"),
    fetch("../assets/kanji_to_id.json"),
    fetch("../assets/vocab_to_id.json"),
  ]);
  KANJI_TO_WANIKANI = await r1.json();
  KANJI_TO_ID       = await r2.json();
  VOCAB_TO_ID       = await r3.json();
  loaded = true;
}

// Returns the dictionary form of a conjugated word, or null.
function normalizeToDict(word) {
  const candidates = [];
  const hasKanji   = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(word);

  // ── I-adjectives ──────────────────────────────────────────
  const iAdj = [
    ["く",         "い"], ["くて",       "い"], ["くない",     "い"],
    ["くなかった", "い"], ["かった",     "い"], ["かったです", "い"],
    ["くなる",     "い"], ["くなった",   "い"], ["ければ",     "い"],
    ["くも",       "い"], ["さ",         "い"], ["そう",       "い"],
    ["すぎる",     "い"], ["です",       "い"],
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
      "する":"する","して":"する","した":"する","しない":"する","しなかった":"する",
      "します":"する","しました":"する","しません":"する","しませんでした":"する",
      "しろ":"する","するな":"する","しなければ":"する","すれば":"する",
      "しても":"する","したら":"する","できる":"する","できた":"する","できない":"する",
      "させる":"する","させた":"する","させない":"する","される":"する","された":"する","されない":"する",
      "くる":"くる","きて":"くる","きた":"くる","こない":"くる","こなかった":"くる",
      "きます":"くる","きました":"くる","きません":"くる","こい":"くる",
      "くれば":"くる","きても":"くる","きたら":"くる","こさせる":"くる","こられる":"くる",
      "来る":"来る","来て":"来る","来た":"来る","来ない":"来る","来ます":"来る","来い":"来る",
    };
    if (irregulars[word]) candidates.push(irregulars[word]);

    // ── Ichidan verbs ─────────────────────────────────────────
    const ichidan = [
      "て","た","ない","なかった","ます","ました","ません","ませんでした",
      "られる","られた","られない","させる","させた","させない","させられる",
      "れば","たら","ても","ろ","よ","よう","ながら","そう","すぎる",
    ];
    for (const suffix of ichidan) {
      if (word.endsWith(suffix)) candidates.push(word.slice(0, -suffix.length) + "る");
    }

    // ── Godan verbs ───────────────────────────────────────────
    const godan = [
      ["って","う"],["った","う"],["いて","く"],["いた","く"],["いで","ぐ"],["いだ","ぐ"],
      ["して","す"],["した","す"],["んで","ぬ"],["んだ","ぬ"],["んで","む"],["んだ","む"],
      ["んで","ぶ"],["んだ","ぶ"],["って","つ"],["った","つ"],["って","る"],["った","る"],
      ["わない","う"],["かない","く"],["がない","ぐ"],["さない","す"],["なない","ぬ"],
      ["まない","む"],["ばない","ぶ"],["たない","つ"],["らない","る"],
      ["わなかった","う"],["かなかった","く"],["がなかった","ぐ"],["さなかった","す"],
      ["まなかった","む"],["ばなかった","ぶ"],["たなかった","つ"],["らなかった","る"],
      ["い","う"],["き","く"],["ぎ","ぐ"],["し","す"],["に","ぬ"],["み","む"],
      ["び","ぶ"],["ち","つ"],["り","る"],
      ["います","う"],["きます","く"],["ぎます","ぐ"],["します","す"],["にます","ぬ"],
      ["みます","む"],["びます","ぶ"],["ちます","つ"],["ります","る"],
      ["いました","う"],["きました","く"],["いません","う"],["きません","く"],
      ["える","う"],["ける","く"],["げる","ぐ"],["せる","す"],["ねる","ぬ"],
      ["める","む"],["べる","ぶ"],["てる","つ"],["れる","る"],
      ["われる","う"],["かれる","く"],["がれる","ぐ"],["される","す"],["なれる","ぬ"],
      ["まれる","む"],["ばれる","ぶ"],["たれる","つ"],["られる","る"],
      ["わせる","う"],["かせる","く"],["がせる","ぐ"],["させる","す"],["なせる","ぬ"],
      ["ませる","む"],["ばせる","ぶ"],["たせる","つ"],["らせる","る"],
      ["えば","う"],["けば","く"],["げば","ぐ"],["せば","す"],["ねば","ぬ"],
      ["めば","む"],["べば","ぶ"],["てば","つ"],["れば","る"],
      ["おう","う"],["こう","く"],["ごう","ぐ"],["そう","す"],["のう","ぬ"],
      ["もう","む"],["ぼう","ぶ"],["とう","つ"],["ろう","る"],
      ["え","う"],["け","く"],["げ","ぐ"],["せ","す"],["ね","ぬ"],
      ["め","む"],["べ","ぶ"],["て","つ"],["れ","る"],
      ["ったら","う"],["いたら","く"],["いだら","ぐ"],["したら","す"],
      ["んだら","む"],["んだら","ぶ"],["ったら","つ"],["ったら","る"],
      ["っても","う"],["いても","く"],["いでも","ぐ"],["しても","す"],
      ["んでも","む"],["んでも","ぶ"],["っても","つ"],["っても","る"],
      ["いながら","く"],["ちながら","つ"],["りながら","る"],
      ["みながら","む"],["びながら","ぶ"],["しながら","す"],
      ["いすぎる","く"],["りすぎる","る"],["みすぎる","む"],
      ["いすぎる","う"],["しすぎる","す"],
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

export function analyzeLyrics(text) {
  const vocabIds = [];
  const kanjiIds = [];
  const seenVocab = new Set();
  const seenKanji = new Set();

  let i = 0;
  while (i < text.length) {
    let bestMatch = null;
    let bestLength = 0;
    let bestNorm = null;

    for (let j = i + 1; j <= text.length; j++) {
      const sub = text.slice(i, j);

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
      if (!seenVocab.has(bestNorm) && isInWanikani && VOCAB_TO_ID[bestNorm]) {
        seenVocab.add(bestNorm);
        vocabIds.push(VOCAB_TO_ID[bestNorm][0]);
      }
      i += bestLength;
    } else {
      i++;
    }
  }

  for (const char of text) {
    if (KANJI_TO_ID[char] && !seenKanji.has(char)) {
      seenKanji.add(char);
      kanjiIds.push(KANJI_TO_ID[char][0]);
    }
  }

  return { vocabulary: vocabIds, kanji: kanjiIds };
}
