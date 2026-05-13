// components/wordInformation.js
import { radicalPillQuiz, kanjiPillQuiz, vocabPillQuiz } from "./kanjiPill.js";
import { relatedBox } from "./relatedBox.js";
import { occurrencesBox } from "./occurrencesBox.js";
import { highlightWord } from "../quiz/utils.js";

export function wordInformation(item, { getSubject, onNavigate, fetchOccurrences, occurrences }) {
    const wrap = document.createElement("div");
    wrap.className = "word-information";
    const isKanji = item.object === "kanji";
    const nav = onNavigate ?? (() => { });

    // ── Radicaux ──────────────────────────────────────────────
    if (isKanji) {
        const box = relatedBox("Components", item.radical_from_kanji, getSubject, radicalPillQuiz, nav);
        if (box) wrap.appendChild(box);
    }

    // ── Related (vocab ou kanji) ──────────────────────────────
    // ── Related (vocab ou kanji) ──────────────────────────────
    const relatedIds = isKanji ? (item.kanji_to_vocab ?? []) : (item.kanji_from_vocab ?? []);
    const relTitle = isKanji ? "Vocabulary" : "Kanji";
    const relBuilder = isKanji ? vocabPillQuiz : kanjiPillQuiz;

    // Trier les ids par fréquence avant de passer à relatedBox
    const sortedIds = [...relatedIds].sort((a, b) => {
        const itemA = getSubject(a);
        const itemB = getSubject(b);
        return (itemA?.frequency ?? Infinity) - (itemB?.frequency ?? Infinity);
    });

    const related = relatedBox(relTitle, sortedIds, getSubject, relBuilder, nav);
    if (related) wrap.appendChild(related);

    // ── Occurrences ───────────────────────────────────────────
    if (fetchOccurrences) {
        wrap.appendChild(occurrencesBox(item.id, fetchOccurrences));
    } else if (occurrences?.length) {
        const box = document.createElement("div");
        box.className = "wd-occurrences";
        const t = document.createElement("div");
        t.className = "wd-occurrences-title";
        t.textContent = "Seen in";
        box.appendChild(t);
        occurrences.forEach(occ => {
            const el = document.createElement("div");
            el.className = "wd-occurrence-item";
            el.innerHTML = `
        <div class="wd-occurrence-source">🎵 ${occ.source}</div>
        <div class="wd-occurrence-sentence">${occ.sentence}</div>
      `;
            box.appendChild(el);
        });
        wrap.appendChild(box);
    }

    // ── Exemples ──────────────────────────────────────────────
    const t = document.createElement("div");
    t.className = "wd-occurrences-title";
    t.textContent = "Examples";
    wrap.appendChild(t);
    item.examples?.forEach(ex => {
        const wrap2 = document.createElement("div");
        wrap2.className = "quiz-example-item";

        const jaDiv = document.createElement("div");
        jaDiv.className = "quiz-example-ja";
        jaDiv.innerHTML = highlightWord(ex.ja, item.prompt);

        const enDiv = document.createElement("div");
        enDiv.className = "quiz-example-en";
        enDiv.textContent = ex.en;

        wrap2.appendChild(jaDiv);
        wrap2.appendChild(enDiv);
        wrap.appendChild(wrap2);
    });

    return wrap;
}