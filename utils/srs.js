// utils/srs.js
import { getTodayLocal, increaseDate } from "./date.js";

const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

export function nextSRSLevel(currentLevel, isCorrect) {
    if (!isCorrect) return 0;
    return Math.min((currentLevel ?? 0) + 1, SRS_INTERVALS.length);
}

export function nextReviewDate(srsLevel) {
    const days = SRS_INTERVALS[srsLevel] ?? 30;
    console.log(`Calculating next review date for SRS level ${srsLevel}: +${days} days`);
    return increaseDate(getTodayLocal(), days);
}

export function isDueToday(nextReview) {
    const today = getTodayLocal();
    return !nextReview || nextReview <= today;
}