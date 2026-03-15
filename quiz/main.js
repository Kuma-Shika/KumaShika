// =========================================================
// MAIN — point d'entrée et orchestration générale
//
// Ce fichier :
//   1. Charge les données (sujets JSON + données utilisateur)
//   2. Orchestre le flux question → réponse → question suivante
//   3. Branche les événements DOM
// =========================================================

import {
  loadJapaneseMaps,
  romajiToKana, kanaToKanji,
  showKanjiSuggestions, hideKanjiSuggestions,
  selectNextSuggestion, selectPrevSuggestion,
  maps
} from "./japanese.js";
import { quizState, urlParams } from "./state.js";
import { dbGet, currentUser } from "../index/db.js";
import {
  buildQuestions,
  prioritizeQuestions
} from "./quiz-builder.js";
import {
  updateCardProgress,
  markLevelSuccess,
  incrementStreakNew,
  incrementStreakReviews
} from "./user-db.js";
import {
  initMultiplayer,
  startQuestionTimer,
  stopQuestionTimer,
  updatePlayerScore
} from "./multiplayer.js";
import {
  initHeader, updateHeader,
  showQuestion, displayAnswerCard,
  resetAnswerArea, showResultScreen,
  resetUIForRetry, updateKindLabel,
  updateHeaderScore, updateScoreBadge
} from "./ui.js";
import {
  shuffle, normalize,
  isCloseEnough, regardlessKana
} from "./utils.js";
import {
  input, submitBtn, retryBtn,
  continueBtn, returnBtn,
  suggestionsEl
} from "./dom.js";

// =========================================================
// CHARGEMENT DES DONNÉES
console.log("URL params:", urlParams);
// =========================================================

/**
 * Charge le fichier JSON de niveau et lance le quiz.
 */
async function loadLevelMode() {
  const response = await fetch(`../id_per_level/${urlParams.level}_${urlParams.type}.json`);
  const ids = await response.json();

  quizState.questions = await buildQuestions(ids, urlParams.exercise_display);
  shuffle(quizState.questions);

  updateHeader();
  showCurrentQuestion();

  if (quizState.isMultiplayer) initMultiplayer();
}

/**
 * Charge les vocabulaires d'un niveau personnalisé (mode "own").
 */
async function loadOwnMode() {
  const snap = await dbGet(`users/${currentUser()}`);
  const data = snap.data();
  const ids = data.ownLevels[urlParams.own];
  console.log("data:", data);
  console.log("ownLevels:", data.ownLevels);
  console.log("urlParams.own:", urlParams.own);


  quizState.questions = await buildQuestions(ids[urlParams.type], urlParams.exercise_display);
  shuffle(quizState.questions);

  updateHeader();
  showCurrentQuestion();
}

/**
 * Charge les cartes à réviser (spaced repetition) pour l'utilisateur courant.
 */async function loadReviewsMode() {
  const username = currentUser();
  if (!username) {
    console.error("Aucun utilisateur connecté");
    window.location.href = "../index.html";
    return;
  }

  const snap = await dbGet(`users/${username}`);
  if (!snap.exists()) { console.error("Utilisateur introuvable"); return; }

  const cardsData = snap.data().cards;
  if (!cardsData) { console.error("Pas de champ cards"); return; }

  const TYPES = ["meaning", "reading", "reverse"];

  const userCards = await Promise.all(
    Object.entries(cardsData).flatMap(([id, cardEntry]) =>
      TYPES
        .filter(type => cardEntry[type])          // seulement les types qui existent
        .map(async type => {
          const rebuilt = await buildQuestions([id], type);
          if (!rebuilt?.length) return null;

          return {
            ...rebuilt[0],
            attempts:    cardEntry[type].attempts    || 0,
            correct:     cardEntry[type].correct     || 0,
            occurrences: cardEntry.occurrences       || [],
            cardId: `${id}-${type}`,
          };
        })
    )
  );

  quizState.questions = prioritizeQuestions(userCards.filter(Boolean)).slice(0, 50);

  updateHeader();
  showCurrentQuestion();
}
/**
 * Point d'entrée : choisit le mode selon les paramètres URL.
 */
async function loadQuizData() {
  try {
    if (urlParams.level_all !== null) await loadLevelMode();
    else if (urlParams.own_all !== null) await loadOwnMode();
    else if (urlParams.isReviews) await loadReviewsMode();
  } catch (err) {
    console.error("Erreur chargement quiz:", err);
  }
}

// =========================================================
// FLUX QUESTION / RÉPONSE
// =========================================================

/**
 * Affiche la question courante ou l'écran de résultat si le quiz est terminé.
 */
function showCurrentQuestion() {
  if (quizState.index >= quizState.questions.length) {
    showResultScreen();
    return;
  }
  showQuestion();
  if (quizState.isMultiplayer) startQuestionTimer(handleSubmit);
}

/**
 * Vérifie la réponse de l'utilisateur.
 * @param {Object}  q
 * @param {string}  userAnswer  Réponse normalisée
 * @returns {boolean}
 */
function checkAnswer(q, userAnswer) {
  if (q.kind === "meaning") {
    return q.answers.some(a => isCloseEnough(normalize(a), userAnswer));
  }
  return q.answers.some(a => regardlessKana(normalize(a), userAnswer, maps.allToHiragana));
}

/**
 * Traite la soumission d'une réponse (ou la progression vers la question suivante).
 */
async function handleSubmit() {
  const q = quizState.questions[quizState.index];

  // Convertir le "n" final en ん pour les modes de lecture
  if (q.kind !== "meaning" && input.value.endsWith("n")) {
    input.value = input.value.slice(0, -1) + "ん";
  }

  // --- Premier appui : évaluation de la réponse ---
  if (!quizState.awaitingNext) {
    quizState.awaitingNext = true;
    const userAnswer = normalize(input.value);
    const isCorrect = checkAnswer(q, userAnswer);

    applyAnswerFeedback(q, isCorrect);
    displayAnswerCard(q);

    if (quizState.isMultiplayer) {
      stopQuestionTimer();
      await updatePlayerScore(isCorrect);
    }

    updateKindLabel(q, isCorrect);
    updateHeaderScore();
    updateScoreBadge();

    input.readOnly = true;

    // Persistance asynchrone (pas bloquant pour l'UI)
    updateCardProgress(q, isCorrect);
    return;
  }

  // --- Deuxième appui : passer à la question suivante ---
  quizState.index++;
  updateHeader();
  resetAnswerArea();
  showCurrentQuestion();
}

/**
 * Met à jour l'état du quiz et l'apparence de l'input selon le résultat.
 * @param {Object}  q
 * @param {boolean} isCorrect
 */
function applyAnswerFeedback(q, isCorrect) {
  if (isCorrect) {
    input.classList.add("correct");
    quizState.correct++;
  } else {
    input.classList.add("wrong");
    quizState.failedCards.push(q);
  }
}

// =========================================================
// REJEU DES CARTES RATÉES
// =========================================================

/**
 * Relance le quiz uniquement sur les cartes ratées.
 */
function retryFailedCards() {
  if (!quizState.failedCards.length) return;

  quizState.index = 0;
  quizState.questions = quizState.failedCards;
  quizState.failedCards = [];
  quizState.correct = 0;
  quizState.redid = true;

  resetUIForRetry();
  updateHeader();
  resetAnswerArea();
  showCurrentQuestion();
}

// =========================================================
// FIN DE QUIZ
// =========================================================

/**
 * Déclenche les actions de fin : streak, niveau complété, nettoyage multijoueur.
 */
async function handleQuizComplete() {
  const { correct, questions } = quizState;
  if (correct !== questions.length) return;

  if (urlParams.isReviews) {
    await incrementStreakReviews();
  } else if (!quizState.redid) {
    await markLevelSuccess(urlParams.level_all);
    await incrementStreakNew();
  }

  if (quizState.isMultiplayer && quizState.gameUnsubscribe) {
    quizState.gameUnsubscribe();
  }
}

// =========================================================
// ÉVÉNEMENTS DOM
// =========================================================

// Boutons
submitBtn.addEventListener("click", handleSubmit);
returnBtn.onclick = () => { window.location.href = "../index.html"; };
continueBtn.onclick = () => retryFailedCards();
retryBtn.onclick = () => window.location.reload();

// Clavier global
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["Tab", "Escape", "F5"].includes(e.key)) return;

  if (e.key === "Enter") {
    e.preventDefault();

    // Valider une suggestion kanji
    if (!suggestionsEl.classList.contains("hidden") && quizState.suggestionIndex >= 0) {
      input.value = quizState.kanjiOnly + quizState.currentSuggestions[quizState.suggestionIndex];
      hideKanjiSuggestions();
      input.focus();
      return;
    }

    handleSubmit();
    return;
  }

  // Toute autre touche → focus sur l'input
  if (document.activeElement !== input && !input.readOnly) input.focus();
});

// Navigation dans les suggestions kanji
input.addEventListener("keydown", e => {
  if (suggestionsEl.classList.contains("hidden")) return;
  if (e.key === "ArrowDown") { e.preventDefault(); selectNextSuggestion(); }
  if (e.key === "ArrowUp") { e.preventDefault(); selectPrevSuggestion(); }
});

// Saisie : conversion romaji → kana + suggestions kanji
input.addEventListener("input", () => {
  if (!quizState.questions.length) return;

  const q = quizState.questions[quizState.index];
  const raw = input.value.toLowerCase();
  input.value = raw;

  if (q.kind !== "meaning") {
    const kana = romajiToKana(raw);
    input.value = kana;

    if (q.kind === "reverse") {
      const validKana = Object.values(maps.romajiToKana);
      const kanaOnly = kana.split("").filter(c => validKana.includes(c)).join("");
      quizState.kanjiOnly = kana.split("").filter(c => !validKana.includes(c)).join("");
      showKanjiSuggestions(kanaToKanji(kanaOnly));
    }
  }
});

// Fermer les suggestions en cliquant ailleurs
document.addEventListener("click", e => {
  if (!input.contains(e.target) && !suggestionsEl.contains(e.target)) {
    hideKanjiSuggestions();
  }
});

// =========================================================
// BOOTSTRAP
// =========================================================

initHeader();

// On pré-charge les maps japonaises et les sujets en parallèle
Promise.all([
  loadJapaneseMaps(),
  fetch("../data/all_subjects_simplified.json")
    .then(r => r.json())
    .then(data => { window.ALL_SUBJECTS = data; }),
]).then(() => loadQuizData());
