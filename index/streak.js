// ============================================================
//  streak.js  —  Streak display
//  Pure UI update from streakData fetched by db.js.
// ============================================================

import { fetchStreakData } from "./db.js";
import { getTodayProgress, getTodayReviewsStats } from "../utils/dailyWords.js";
import { getReviewsDue } from "../utils/dailyWords.js";
import { getTodayLocal } from "../utils/date.js";

export function updateStreakDisplay(userData) {
  if (!userData) return;
  try {
    const today = getTodayLocal();
    const todayStreak = userData?.streak?.[today] ?? {};

    const discoverNew = todayStreak.discover_new ?? 0;
    const reviewsOld = todayStreak.old_reviews_number ?? 0;
    const reviewsNew = todayStreak.new_reviews_number ?? 0;
    const reviewsAll = todayStreak.all_reviews_number ?? 0;
    const doneOld = todayStreak.old_reviews_done ?? 0;
    const doneNew = todayStreak.new_reviews_done ?? 0;
    const reviewComplete = (reviewsOld === 0 || doneOld >= reviewsOld)
      && (reviewsNew === 0 || doneNew >= reviewsNew);

    document.getElementById("streakDays").textContent = countStreak(userData.streak ?? {});

    const goalNew = document.getElementById("goalNew");
    goalNew.querySelector(".goal-status").textContent = `${discoverNew} / 60`;
    goalNew.classList.toggle("completed", discoverNew >= 60);

    const goalReview = document.getElementById("goalReview");
    if (reviewsOld === 0 && reviewsNew === 0) {
      goalReview.querySelector(".goal-status").textContent = "No reviews ✓";
    } else {
      const oldPart = reviewsOld > 0 ? `${doneOld}/${reviewsOld}` : null;
      const newPart = reviewsNew > 0 ? `${doneNew}/${reviewsNew} new` : null;
      goalReview.querySelector(".goal-status").textContent =
        [oldPart, newPart].filter(Boolean).join("  +  ");
    }
    goalReview.classList.toggle("completed", reviewComplete);

  } catch (err) {
    console.error("updateStreakDisplay:", err);
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function countStreak(streakData) {

  let count = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const day = streakData[formatDate(cursor)];
    if (!day) break;

    const reviewsOld = day.old_reviews_number ?? 0;
    const reviewsNew = day.new_reviews_number ?? 0;
    const doneOld = day.old_reviews_done ?? 0;
    const doneNew = day.new_reviews_done ?? 0;
    const reviewsOk = (reviewsOld === 0 || doneOld >= reviewsOld)
      && (reviewsNew === 0 || doneNew >= reviewsNew);

    if (!reviewsOk) break; // reviews pas faites → streak cassée

    if (day.discover_new >= 60) count++; // reviews ok + nouveaux mots → incrémente
    // reviews ok mais pas 60 nouveaux → on continue sans incrémenter

    cursor.setDate(cursor.getDate() - 1);
  }

  const today = streakData[formatDate(new Date())] || {};
  const reviewsOld = today.old_reviews_number ?? 0;
  const reviewsNew = today.new_reviews_number ?? 0;
  const doneOld = today.old_reviews_done ?? 0;
  const doneNew = today.new_reviews_done ?? 0;
  const todayReviewsOk = (reviewsOld === 0 || doneOld >= reviewsOld)
    && (reviewsNew === 0 || doneNew >= reviewsNew);

  if (today.discover_new >= 60 && todayReviewsOk) count++;

  return count;
}

function updateGoalItem(id, current) {
  const el = document.getElementById(id);
  el.querySelector(".goal-status").textContent = `${current} / 1`;
  const done = current >= 1;
  el.classList.toggle("completed", done);
  el.querySelector(".goal-check").classList.toggle("hidden", !done);
}