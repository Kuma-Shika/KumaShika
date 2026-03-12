// ============================================================
//  streak.js  —  Streak display
//  Pure UI update from streakData fetched by db.js.
// ============================================================

import { fetchStreakData } from "./db.js";
import { getCurrentUser }  from "./auth.js";

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

export async function updateStreakDisplay() {
  const username = getCurrentUser();
  if (!username) return;

  try {
    const streakData = await fetchStreakData(username);
    if (!streakData) return;

    document.getElementById("streakDays").textContent = countStreak(streakData);

    const today = streakData[formatDate(new Date())] || { new: 0, reviews: 0 };
    updateGoalItem("goalNew",    today.new);
    updateGoalItem("goalReview", today.reviews);
  } catch (err) {
    console.error("updateStreakDisplay:", err);
  }
}
