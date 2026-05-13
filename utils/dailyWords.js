// utils/dailyWords.js
import { getTodayLocal } from "./date.js";
import { isDueToday } from "./srs.js";

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1", "N0"];

function sortByJlptThenFreq(a, b) {
    const jlptDiff = JLPT_ORDER.indexOf(a.jlpt ?? "N0") - JLPT_ORDER.indexOf(b.jlpt ?? "N0");
    if (jlptDiff !== 0) return jlptDiff;
    return (a.frequency ?? Infinity) - (b.frequency ?? Infinity);
}

function isVocab(item) {
    return item.object === "vocabulary" || item.object === "kana_vocabulary";
}

// ── Nouveaux mots ─────────────────────────────────────────────

export function getDailyWords(userData, allSubjects, limit = 60) {
    const cards = userData?.cards ?? {};

    const candidates = Object.values(allSubjects).filter(item => {
        if (!isVocab(item)) return false;
        if (cards[item.id]?.known) return false;
        // Exclure si déjà un srs_level >= 0 (déjà étudié)
        if (cards[item.id]?.reading?.srs_level >= 0) return false;
        return true;
    });

    const withOcc = candidates.filter(item => cards[item.id]?.occurrences?.length);
    const withoutOcc = candidates.filter(item => !cards[item.id]?.occurrences?.length);

    withOcc.sort(sortByJlptThenFreq);
    withoutOcc.sort(sortByJlptThenFreq);

    return [...withOcc, ...withoutOcc].slice(0, limit);
}

// ── Reviews dues ──────────────────────────────────────────────

export function getReviewsDue(userData, allSubjects) {
    const cards = userData?.cards ?? {};
    const EXERCISES = ["meaning", "reading", "reverse"];
    const due = [];
    let skippedKnown = 0, skippedNoItem = 0, skippedNoSRS = 0, skippedNotDue = 0;

    for (const [id, card] of Object.entries(cards)) {
        if (card.known) { skippedKnown++; continue; }

        const item = allSubjects[id];
        if (!item || !isVocab(item)) { skippedNoItem++; continue; }

        for (const exercise of EXERCISES) {
            const entry = card[exercise];
            if (entry?.srs_level == null) { skippedNoSRS++; continue; }
            if (!isDueToday(entry.next_review)) {
                skippedNotDue++;
                continue;
            }
            due.push({ id: parseInt(id), exercise, srs_level: entry.srs_level, next_review: entry.next_review });
        }
    }

    console.log(`Résultat: ${due.length} dues`);
    console.log(`Ignorées: known=${skippedKnown} noItem=${skippedNoItem} noSRS=${skippedNoSRS} notDue=${skippedNotDue}`);

    due.sort((a, b) => (a.next_review ?? "").localeCompare(b.next_review ?? ""));
    return due;
}

export function getReviewsForToday(userData, allSubjects) {
    const today = getTodayLocal();
    const reviewsList = userData?.streak?.[today]?.reviews_list;

    if (reviewsList === undefined) return null; // pas encore initialisé

    return reviewsList
        .map(key => {
            const [id, exercise] = key.split("_");
            const item = allSubjects[id];
            if (!item || !isVocab(item)) return null;
            const card = userData?.cards?.[id];
            return {
                id: parseInt(id),
                exercise,
                srs_level: card?.[exercise]?.srs_level ?? 0,
                next_review: card?.[exercise]?.next_review ?? null,
                key,
            };
        })
        .filter(Boolean);
}

export function getTodayReviewsStats(userData) {
    const today = new Date().toISOString().split("T")[0];
    const todayData = userData?.streak?.[today] ?? {};
    return {
        done: todayData.reviews_done ?? 0,
        total: todayData.reviews_total ?? 0,
        list: todayData.reviews_list ?? [],  // undefined = pas encore initialisé
    };
}

// ── Progression du jour ───────────────────────────────────────

export function getTodayProgress(userData) {
    const today = new Date().toISOString().split("T")[0];
    const streak = userData?.streak?.[today] ?? {};
    return {
        new_done: streak.new_done ?? 0,
        reviews_done: streak.reviews_done ?? 0,
    };
}