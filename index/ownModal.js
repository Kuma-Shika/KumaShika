// ============================================================
//  ownModal.js  —  "New Text" modal
//  Handles open/close and save. Calls back with fresh userData.
// ============================================================

import { getCurrentUser }          from "./auth.js";
import { saveOwnText, fetchUser }  from "./db.js";
import { loadDictionary, analyzeLyrics } from "./analyzer.js";

function show() {
  const modal = document.getElementById("ownModal");
  document.getElementById("ownTitleInput").value   = "";
  document.getElementById("ownContentInput").value = "";
  document.getElementById("ownMessage").textContent = "";
  modal.classList.remove("hidden");
  modal.classList.add("show");
  document.getElementById("ownTitleInput").focus();
}

function hide() {
  const modal = document.getElementById("ownModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");
}

// onSaved(freshUserData) — called after a successful save.
export function initOwnModal(onSaved) {
  document.getElementById("ownCancelBtn").addEventListener("click", hide);

  document.getElementById("ownModal").addEventListener("click", e => {
    if (e.target === document.getElementById("ownModal")) hide();
  });

  document.getElementById("ownSaveBtn").addEventListener("click", async () => {
    const title   = document.getElementById("ownTitleInput").value.trim();
    const content = document.getElementById("ownContentInput").value.trim();
    const msg     = document.getElementById("ownMessage");

    if (!title)            { msg.textContent = "Please enter a title.";   return; }
    if (!content)          { msg.textContent = "Please enter some text."; return; }
    if (!getCurrentUser()) { msg.textContent = "You must be logged in.";  return; }

    msg.textContent = "Analyzing…";
    await loadDictionary();
    const analysis = analyzeLyrics(content);
    await saveOwnText(getCurrentUser(), title, analysis);

    const freshData = await fetchUser(getCurrentUser());
    hide();
    onSaved(freshData);
  });

  // Return the open function so callers can trigger the modal.
  return show;
}
