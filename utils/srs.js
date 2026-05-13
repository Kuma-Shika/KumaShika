// utils/srs.js

const SRS_INTERVALS = [1, 3, 7, 14, 30];

export function nextSRSLevel(currentLevel, isCorrect) {
    if (!isCorrect) return 0;
    return Math.min((currentLevel ?? 0) + 1, SRS_INTERVALS.length);
}

export function nextReviewDate(srsLevel) {
    const days = SRS_INTERVALS[srsLevel] ?? 30;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
}

export function isDueToday(nextReview) {
    const future = new Date();
    future.setDate(future.getDate()); // ← augmenter pour tester
    const futureStr = future.toISOString().split("T")[0];
    return !nextReview || nextReview <= futureStr;
}