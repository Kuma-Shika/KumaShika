// ============================================================
//  streak.js  —  Streak display
//  Pure UI update from streakData fetched by db.js.
// ============================================================

import { fetchStreakData } from "./db.js";
import { getTodayProgress, getTodayReviewsStats } from "../utils/dailyWords.js";
import { getReviewsDue } from "../utils/dailyWords.js";

export async function updateStreakDisplay(userData) {
  if (!userData) return;
  try {
    const { new_done } = getTodayProgress(userData);
    const { done, total } = getTodayReviewsStats(userData);

    document.getElementById("streakDays").textContent = countStreak(userData.streak ?? {});

    const goalNew = document.getElementById("goalNew");
    goalNew.querySelector(".goal-status").textContent = `${new_done} / 60`;
    goalNew.classList.toggle("completed", new_done >= 60);

    const goalReview = document.getElementById("goalReview");
    goalReview.querySelector(".goal-status").textContent =
      total === 0 ? "No reviews" : `${done} / ${total}`;
    goalReview.classList.toggle("completed", total > 0 && done >= total);
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
  cursor.setDate(cursor.getDate() - 1); // start from yesterday

  while (true) {
    const day = streakData[formatDate(cursor)];
    if (day?.new >= 1 && day?.reviews >= 1) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  // Count today if complete
  const today = streakData[formatDate(new Date())] || {};
  if (today.new > 0 && today.reviews > 0) count++;

  return count;
}

function updateGoalItem(id, current) {
  const el = document.getElementById(id);
  el.querySelector(".goal-status").textContent = `${current} / 1`;
  const done = current >= 1;
  el.classList.toggle("completed", done);
  el.querySelector(".goal-check").classList.toggle("hidden", !done);
}
