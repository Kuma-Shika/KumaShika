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

    const newDone = todayStreak.new_done ?? 0;
    const reviewsDone = todayStreak.reviews_done ?? 0;
    const reviewsTotal = todayStreak.reviews_number ?? 0;
    const reviewComplete = reviewsTotal === 0 || reviewsDone >= reviewsTotal;

    document.getElementById("streakDays").textContent = countStreak(userData.streak ?? {});

    const goalNew = document.getElementById("goalNew");
    goalNew.querySelector(".goal-status").textContent = `${newDone} / 60`;
    goalNew.classList.toggle("completed", newDone >= 60);

    const goalReview = document.getElementById("goalReview");
    goalReview.querySelector(".goal-status").textContent =
      reviewsTotal === 0 ? "No reviews ✓" : `${reviewsDone} / ${reviewsTotal}`;
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
    const reviewsOk = !day || day.reviews_number === 0 || day.reviews_done >= day.reviews_number;
    if (day?.new_done >= 60 && reviewsOk) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  const today = streakData[formatDate(new Date())] || {};
  const todayReviewsOk = today.reviews_number === 0 || today.reviews_done >= today.reviews_number;
  if (today.new_done >= 60 && todayReviewsOk) count++;

  return count;
}

function updateGoalItem(id, current) {
  const el = document.getElementById(id);
  el.querySelector(".goal-status").textContent = `${current} / 1`;
  const done = current >= 1;
  el.classList.toggle("completed", done);
  el.querySelector(".goal-check").classList.toggle("hidden", !done);
}