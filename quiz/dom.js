// =========================================================
// DOM — toutes les références aux éléments du document
// =========================================================
//
// Importer depuis ici plutôt que d'appeler getElementById
// partout dans le code.
// =========================================================

// En-tête
export const headerType     = document.getElementById("header-type");
export const headerLevel    = document.getElementById("header-level");
export const headerProgress = document.getElementById("header-progress");
export const headerScore    = document.getElementById("header-score");
export const headerRight    = document.getElementById("header-right");

// Carte de question
export const card       = document.getElementById("card");
export const kindEl     = document.getElementById("kind");
export const questionEl = document.getElementById("question");

// Champ de saisie
export const input         = document.getElementById("answer");
export const suggestionsEl = document.getElementById("kanji-suggestions");

// Carte de réponse
export const answerBox      = document.getElementById("answer-box");
export const answerMain     = document.getElementById("answer-main");
export const answerSub      = document.getElementById("answer-sub");
export const answerPos      = document.getElementById("answer-pos");
export const mnemonicBox    = document.getElementById("explanation-box");
export const answerExamples = document.getElementById("examples");
export const relatedBox     = document.getElementById("related-items");
export const relatedContainer = relatedBox.querySelector(".related-items-container");

// Badge de score
export const scoreBadge = document.getElementById("score-badge");

// Boutons d'action
export const submitBtn   = document.getElementById("submit-btn");
export const retryBtn    = document.getElementById("retry-btn");
export const continueBtn = document.getElementById("continue-btn");
export const returnBtn   = document.getElementById("return-btn");
