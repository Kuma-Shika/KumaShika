// ============================================================
//  index.js  —  Entry point
//  Wires modules together. Contains NO business logic.
// ============================================================

import { VIEWS }             from "./index/config.js";
import { fetchUser }         from "./index/db.js";
import { initAuth, getCurrentUser } from "./index/auth.js";
import { updateStreakDisplay }from "./index/streak.js";
import { initOwnModal }      from "./index/ownModal.js";
import {
  renderMainSelect,
  renderTypeSelect,
  renderLevelSelect,
  renderExerciseSelect,
  renderGridView,
  renderOwnSelect,
} from "./index/views.js";

// ── App state ─────────────────────────────────────────────────
// Single object, never accessed directly outside this file.
const state = {
  view:     VIEWS.MAIN,
  type:     null,   // "radical" | "kanji" | "vocabulary"
  level:    null,   // 1–60
  userData: null,
};

// ── navigate ──────────────────────────────────────────────────
// The only way to change view. Merges params into state then re-renders.
function navigate(view, params = {}) {
  state.view  = view;
  if ("type"  in params) state.type  = params.type;
  if ("level" in params) state.level = params.level;
  render();
}

// ── render ────────────────────────────────────────────────────
function render() {
  switch (state.view) {
    case VIEWS.MAIN:
      renderMainSelect(navigate);
      break;
    case VIEWS.TYPE:
      renderTypeSelect(state.userData, navigate);
      break;
    case VIEWS.LEVEL:
      renderLevelSelect(state.userData, { type: state.type }, navigate);
      break;
    case VIEWS.EXERCISE:
      renderExerciseSelect(state.userData, { type: state.type, level: state.level }, navigate);
      break;
    case VIEWS.GRID:
      renderGridView(state.userData);
      break;
    case VIEWS.OWN:
      renderOwnSelect(state.userData, navigate, openOwnModal);
      break;
  }
}

// ── Own modal (wired here so it can call render after save) ──
const openOwnModal = initOwnModal(freshData => {
  state.userData = freshData;
  render();
});

// ── Auth (re-render after login/logout) ──────────────────────
initAuth(freshData => {
  state.userData = freshData;
  render();
});

// ── Header buttons ───────────────────────────────────────────
document.getElementById("multiplayerBtn").addEventListener("click", () => {
  window.location.href = "multiplayer/multiplayer.html";
});

document.getElementById("gridViewBtn").addEventListener("click", () => {
  if (state.view === VIEWS.GRID) {
    state.type  = null;
    state.level = null;
    navigate(VIEWS.MAIN);
  } else {
    navigate(VIEWS.GRID);
  }
});

// ── Boot ──────────────────────────────────────────────────────
(async () => {
  const username = getCurrentUser();
  if (username) state.userData = await fetchUser(username);
  render();
  updateStreakDisplay();
})();