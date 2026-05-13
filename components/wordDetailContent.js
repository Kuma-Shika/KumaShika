import { radicalPillQuiz, kanjiPillQuiz, vocabPillQuiz } from "./kanjiPill.js";
import { relatedBox } from "./relatedBox.js";
import { occurrencesBox } from "./occurrencesBox.js";

export function wordDetailContent(item, subject, { occurrences, fetchOccurrences, wordId, onNavigate }) {
    const frag = document.createDocumentFragment();
    const isKanji = item.object === "kanji";

    // ── Radicaux ──────────────────────────────────────────────────
    if (isKanji && subject?.radical_from_kanji?.length) {
        const radicals = subject.radical_from_kanji
            .map(id => window.ALL_SUBJECTS[id]).filter(Boolean);
        const box = relatedBox("Components", radicals, radicalPillQuiz, id => onNavigate?.(id));
        frag.appendChild(box);
    }

    // ── Vocab lié au kanji / Kanji lié au vocab ───────────────────
    const relatedIds = isKanji ? (item.kanji_to_vocab ?? []) : (item.kanji_from_vocab ?? []);
    if (relatedIds.length) {
        const related = relatedIds
            .map(id => window.ALL_SUBJECTS[id]).filter(Boolean)
            .sort((a, b) => (a.frequency ?? Infinity) - (b.frequency ?? Infinity));
        const builder = isKanji ? vocabPillQuiz : kanjiPillQuiz;
        const title = isKanji ? "Vocabulary" : "Kanji";
        frag.appendChild(relatedBox(title, related, builder, id => onNavigate?.(id)));
    }

    // Dans wordDetailContent.js — passer les ids triés, pas les items
    const sortedIds = relatedIds
        .map(id => ({ id, item: window.ALL_SUBJECTS[id] }))
        .filter(({ item }) => item)
        .sort((a, b) => (a.item?.frequency ?? Infinity) - (b.item?.frequency ?? Infinity))
        .map(({ id }) => id);

    frag.appendChild(relatedBox(title, sortedIds,
        id => window.ALL_SUBJECTS[id],
        builder,
        id => onNavigate?.(id)
    ));

    // ── Occurrences ───────────────────────────────────────────────
    if (fetchOccurrences) {
        frag.appendChild(occurrencesBox(wordId, fetchOccurrences));
    } else if (occurrences?.length) {
        // Version synchrone pour le quiz (occurrences déjà chargées sur q)
        const box = document.createElement("div");
        box.className = "wd-occurrences";
        const t = document.createElement("div");
        t.className = "wd-occurrences-title";
        t.textContent = "Vu dans";
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
        frag.appendChild(box);
    }

    return frag;
}