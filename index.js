// ============================================================
//  index.js  —  Entry point
//  Wires modules together. Contains NO business logic.
// ============================================================

import { VIEWS } from "./index/config.js";
import { fetchCurrentUser, setCardKnown, setCardUnknown, setCardsKnown, saveOverride, saveCustomSubject, fetchCustomSubjects } from "./index/db.js";
import { setUserData } from "./index/store.js";
import { initAuth, loadSession } from "./index/auth.js";
import { updateStreakDisplay } from "./index/streak.js";
import { initOwnModal, initFolderModal } from "./index/ownModal.js";
import {
  renderLevelSelect,
  renderExerciseSelect,
  renderGridView,
  renderOwnSelect,
  renderOwnType,
  renderOwnExercise,
  renderOwnDetail,
  renderWordDetail,
  renderSearchResults,
  renderWordOccurrences,
  renderProgress,
  renderWordEdit,
  renderQuiz,
  renderProgressExercise,
} from "./index/views.js";
import { renderMainSelect } from "./views/mainSelect.js";
import { renderTypeSelect } from "./views/typeSelect.js";
import { renderQuizSettings } from "./views/quizSettings.js";

// ── App state ─────────────────────────────────────────────────
// Single object, never accessed directly outside this file.
const state = {
  view: VIEWS.MAIN,
  type: null,   // "radical" | "kanji" | "vocabulary"
  level: null,   // 1–60
  userData: null,
  own: null,
  ownPath: [],
  wordId: null,
  searchQuery: "",
  wordOccurrences: [],
  prevView: null,
  progressType: "kanji",
  fromProgress: false,
  wordEditMode: null,
  quizParams: null,
  studyMode: null,
  studyLevelKey: null,
  progressSort: "jlpt",
  quizSettings: null,
};

import { loadJapaneseMaps, romajiToKana, maps } from "./quiz/japanese.js";

// ── navigate ──────────────────────────────────────────────────
// The only way to change view. Merges params into state then re-renders.
function navigate(view, params = {}) {
  const searchRelated = [VIEWS.SEARCH, VIEWS.WORD_DETAIL, VIEWS.WORD_OCCURRENCES];
  if (!searchRelated.includes(state.view)) state.prevView = state.view;
  state.view = view;
  if ("type" in params) state.type = params.type;
  if ("level" in params) state.level = params.level;
  if ("own" in params) state.own = params.own;
  if ("ownPath" in params) state.ownPath = params.ownPath;
  if ("wordId" in params) state.wordId = params.wordId;
  if ("searchQuery" in params) state.searchQuery = params.searchQuery;
  if ("wordOccurrences" in params) state.wordOccurrences = params.wordOccurrences;
  if ("progressType" in params) state.progressType = params.progressType;
  if ("fromProgress" in params) state.fromProgress = params.fromProgress;
  if ("wordEditMode" in params) state.wordEditMode = params.wordEditMode;
  if ("quizParams" in params) state.quizParams = params.quizParams;
  if ("studyMode" in params) state.studyMode = params.studyMode;
  if ("studyLevelKey" in params) state.studyLevelKey = params.studyLevelKey;
  if ("progressSort" in params) state.progressSort = params.progressSort;
  render();
}

// ── render ────────────────────────────────────────────────────
function render() {
  document.querySelector('.streak-container').style.display = state.view === VIEWS.MAIN ? '' : 'none';

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
      renderOwnSelect(state.userData, navigate, openOwnModal, openFolderModal, state.ownPath,
        async (freshData) => {
          state.userData = freshData;
          setUserData(freshData);
          render();
        }
      );
      break;
    case VIEWS.OWN_TYPE:
      renderOwnType(state.userData, { own: state.own }, navigate);
      break;
    case VIEWS.OWN_EXERCISE:
      renderOwnExercise(state.userData, { own: state.own, type: state.type }, navigate);
      break;
    case VIEWS.OWN_DETAIL:
      renderOwnDetail(state.userData, { own: state.own, ownPath: state.ownPath }, navigate);
      break;
    case VIEWS.WORD_DETAIL:
      renderWordDetail({
        wordId: state.wordId,
        own: state.own,
        ownPath: state.ownPath,
        searchQuery: state.searchQuery,
        fromProgress: state.fromProgress,
        progressType: state.progressType,
        userData: state.userData,
      }, navigate, async (wordId, currentlyKnown) => {
        if (currentlyKnown) {
          await setCardUnknown(wordId);
        } else {
          await setCardKnown(wordId);
        }
        state.userData = await fetchCurrentUser();
        render();
      });
      break;
    case VIEWS.SEARCH:
      renderSearchResults(state.searchQuery, navigate);
      break;
    case VIEWS.WORD_OCCURRENCES:
      renderWordOccurrences({
        wordId: state.wordId,
        wordOccurrences: state.wordOccurrences,
        own: state.own,
        ownPath: state.ownPath,
        searchQuery: state.searchQuery,
        userData: state.userData,
      }, navigate);
      break;
    case VIEWS.PROGRESS:
      renderProgress(state.userData, state.progressType, state.progressSort, navigate, async (wordIds) => {
        await setCardsKnown(wordIds);
        const fresh = await fetchCurrentUser();
        state.userData = fresh;
        setUserData(fresh);
        render();
      });
      break;
    case VIEWS.WORD_EDIT:
      renderWordEdit({
        wordId: state.wordId,
        own: state.own,
        ownPath: state.ownPath,
        mode: state.wordEditMode,
        userData: state.userData,
      }, navigate, async (mode, wordId, data) => {
        if (mode === "edit") {
          await saveOverride(wordId, data);
        } else {
          await saveCustomSubject(data);
        }

        state.userData = await fetchCurrentUser();
        // Retourne à la carte du mot
        navigate(VIEWS.WORD_DETAIL, {
          wordId: state.wordId,
          own: state.own,
          ownPath: state.ownPath,
          userData: state.userData
        });
      });
      break;
    case VIEWS.QUIZ:
      renderQuiz(state.quizParams, state.userData, navigate);
      break;
    case VIEWS.PROGRESS_EXERCISE:
      renderProgressExercise(
        { studyMode: state.studyMode, studyLevelKey: state.studyLevelKey, progressType: state.progressType },
        state.userData,
        navigate
      );
      break;
    case VIEWS.QUIZ_SETTINGS:
      renderQuizSettings(
        state.quizParams,
        navigate,
        () => navigate(state.prevView)  // bouton back → vue précédente
      );
      break;
  }
}


const openOwnModal = initOwnModal(freshData => {
  state.userData = freshData;
  setUserData(state.userData);
  render();
}, () => state.ownPath);

const openFolderModal = initFolderModal(freshData => {
  state.userData = freshData;
  setUserData(state.userData);
  render();
}, () => state.ownPath);

// ── Auth (re-render after login/logout) ──────────────────────
// Boot
updateStreakDisplay(state.userData);

// Après login
initAuth(freshData => {
  state.userData = freshData;
  setUserData(freshData);
  updateStreakDisplay(freshData);
  render();
});

// ── Header buttons ───────────────────────────────────────────
document.getElementById("multiplayerBtn").addEventListener("click", () => {
  window.location.href = "multiplayer/multiplayer.html";
});


document.getElementById("searchInput").addEventListener("input", e => {
  const raw = e.target.value.toLowerCase();
  const kana = romajiToKana(raw);
  e.target.value = kana;

  const hasRomaji = /[a-zA-Z]/.test(kana);
  if (kana && !hasRomaji) {
    navigate(VIEWS.SEARCH, { searchQuery: kana });
  } else if (!kana) {
    // Retourne à la vue précédente, pas forcément MAIN
    const prev = state.view === VIEWS.SEARCH ? state.prevView ?? VIEWS.MAIN : state.view;
    navigate(prev);
  }
});

// ── Boot ──────────────────────────────────────────────────────
(async () => {
  const userData = await loadSession();
  if (userData) {
    state.userData = userData;
    setUserData(userData);
  }

  await Promise.all([
    fetch("data/all_subjects_simplified.json")
      .then(r => r.json())
      .then(data => { window.ALL_SUBJECTS = data; }),
    loadJapaneseMaps(),
  ]);

  window.CUSTOM_SUBJECTS = await fetchCustomSubjects();

  render();
  updateStreakDisplay(state.userData);
})();