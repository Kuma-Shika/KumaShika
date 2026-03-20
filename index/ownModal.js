// ============================================================
//  ownModal.js  —  "New Text" modal
//  Handles open/close and save. Calls back with fresh userData.
// ============================================================

import { getCurrentUser }          from "./auth.js";
import { saveOwnFolder, saveOwnText, fetchUser }  from "./db.js";
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

    msg.textContent = "Analyzing...";
    await loadDictionary();

    // title is used as the source label so each occurrence knows which text it came from
    const analysis = analyzeLyrics(content, title);
    await saveOwnText(getCurrentUser(), title, analysis);

    const freshData = await fetchUser(getCurrentUser());
    hide();
    onSaved(freshData);
  });

  // Return the open function so callers can trigger the modal.
  return show;
}


export function initFolderModal(onSaved) {
  document.getElementById("folderCancelBtn").addEventListener("click", hideFolder);
  document.getElementById("folderModal").addEventListener("click", e => {
    if (e.target === document.getElementById("folderModal")) hideFolder();
  });

  document.getElementById("folderSaveBtn").addEventListener("click", async () => {
    const name = document.getElementById("folderTitleInput").value.trim();
    const msg  = document.getElementById("folderMessage");

    if (!name)             { msg.textContent = "Please enter a folder name."; return; }
    if (!getCurrentUser()) { msg.textContent = "You must be logged in.";      return; }

    try {
      await saveOwnFolder(getCurrentUser(), name);
      const freshData = await fetchUser(getCurrentUser());
      hideFolder();
      onSaved(freshData);
    } catch (e) {
      if (e.message === "already_exists") {
        msg.textContent = "A folder with this name already exists.";
      } else {
        msg.textContent = "An error occurred.";
      }
    }
  });

  return showFolder;
}

function showFolder() {
  const modal = document.getElementById("folderModal");
  document.getElementById("folderTitleInput").value = "";
  document.getElementById("folderMessage").textContent = "";
  modal.classList.remove("hidden");
  modal.classList.add("show");
  document.getElementById("folderTitleInput").focus();
}

function hideFolder() {
  const modal = document.getElementById("folderModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");
}