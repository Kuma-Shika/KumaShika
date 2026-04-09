// =========================================================
// UI — rendu DOM : afficher une question, la carte de réponse,
//       l'écran de résultats, le header, le badge de score…
// =========================================================

import { quizState, urlParams } from "./state.js";
import {
  headerType, headerLevel, headerProgress, headerScore, headerRight,
  card, kindEl, questionEl,
  answerBox, answerMain, answerSub, answerPos,
  mnemonicBox, answerExamples,
  relatedBox, relatedContainer,
  scoreBadge,
  input, submitBtn, retryBtn, continueBtn, returnBtn,
} from "./dom.js";
import { cleanText, highlightWord } from "./utils.js";

// ----------------------------------------------------------
// Header
// ----------------------------------------------------------

/**
 * Initialise le header avec le type et le niveau courant.
 */
export function initHeader() {
  headerType.textContent  = urlParams.type.toUpperCase();
  headerLevel.textContent = `Level ${urlParams.level}`;
  headerRight.setAttribute("data-type",  urlParams.type.toUpperCase());
  headerRight.setAttribute("data-level", `Level ${urlParams.level}`);
}

/**
 * Met à jour la progression affichée dans le header.
 */
export function updateHeader() {
  headerProgress.textContent =
    `${quizState.index + 1} / ${quizState.questions.length}`;
}

// ----------------------------------------------------------
// Badge de score
// ----------------------------------------------------------

/**
 * Met à jour la classe CSS du badge de score selon le pourcentage.
 */
export function updateScoreBadge() {
  const percent = computeCurrentScorePercent();
  scoreBadge.classList.remove("excellent", "good", "needs-work");

  if      (percent >= 80) scoreBadge.classList.add("excellent");
  else if (percent >= 60) scoreBadge.classList.add("good");
  else                    scoreBadge.classList.add("needs-work");
}

/**
 * Calcule le pourcentage de bonnes réponses pour la question courante.
 * @returns {number}
 */
function computeCurrentScorePercent() {
  const answered = quizState.index + 1;
  return Math.round((quizState.correct / answered) * 100);
}

// ----------------------------------------------------------
// Question
// ----------------------------------------------------------

/**
 * Affiche la question courante et réinitialise l'input.
 * @param {Function} onTimerExpire  Callback si le timer expire (multijoueur)
 */
export function showQuestion() {
  input.value    = "";
  input.className = "";
  input.readOnly = false;
  input.focus();

  quizState.awaitingNext = false;
  quizState.flagSubmit   = false;

  if (quizState.index >= quizState.questions.length) return; // géré par main.js

  const q = quizState.questions[quizState.index];
  questionEl.textContent = q.prompt;
  kindEl.textContent     = `${q.kind} (${q.correct}/${q.attempts})`;
  card.className         = `${q.object}-${q.kind}`;
}

// ----------------------------------------------------------
// Carte de réponse
// ----------------------------------------------------------

/**
 * Affiche la carte de correction sous la question.
 * @param {Object} q  Question courante
 */
export function displayAnswerCard(q) {
  clearAnswerCard();

  const answersText = cleanText(q.answers.join(", "));

  switch (`${q.object}:${q.kind}`) {
    case "radical:meaning":
      renderAnswerCard({ main: answersText, color: "blue",
        mnemonic: q.meaning_mnemonic });
      break;

    case "kanji:meaning":
      renderAnswerCard({ main: answersText, sub: cleanText(q.readings.join(", ")),
        color: "light_pink", mnemonic: q.meaning_mnemonic });
      break;

    case "kanji:reading":
      renderAnswerCard({ main: answersText, sub: cleanText(q.meanings.join(", ")),
        color: "dark_pink", mnemonic: q.reading_mnemonic });
      break;

    case "kanji:reverse":
      renderAnswerCard({ main: answersText, sub: cleanText(q.readings.join(", ")),
        color: "reverse_pink", mnemonic: q.reading_mnemonic, showExamples: true });
      break;

    case "vocabulary:meaning":
    case "kana_vocabulary:meaning":
      renderAnswerCard({ main: answersText, sub: cleanText(q.readings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "light_purple", mnemonic: q.meaning_mnemonic, showExamples: true });
      break;

    case "vocabulary:reading":
    case "kana_vocabulary:reading":
      renderAnswerCard({ main: answersText, sub: cleanText(q.meanings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "dark_purple", mnemonic: q.reading_mnemonic, showExamples: true });
      break;

    case "vocabulary:reverse":
    case "kana_vocabulary:reverse":
      renderAnswerCard({ main: answersText, sub: cleanText(q.readings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "reverse_purple", mnemonic: q.reading_mnemonic, showExamples: true });
      break;
  }

  if (q.examples?.length) renderExamples(q.examples, q.prompt);
  displayRelatedItems(q);
}

/**
 * Injecte le contenu dans la carte de réponse et la rend visible.
 * @param {{ main, sub?, pos?, color, mnemonic, showExamples? }} opts
 */
function renderAnswerCard({ main, sub, pos, color, mnemonic, showExamples = false }) {
  answerMain.textContent = main;
  if (sub)  answerSub.textContent = sub;
  if (pos) { answerPos.textContent = pos; answerPos.classList.remove("hidden"); }

  answerBox.classList.remove("hidden");
  answerBox.classList.add(color);
  mnemonicBox.classList.remove("hidden");
  mnemonicBox.textContent = cleanText(mnemonic);

  if (showExamples) answerExamples.classList.remove("hidden");
}

/**
 * Vide et remet à zéro la carte de réponse.
 */
function clearAnswerCard() {
  answerBox.classList.remove(
    "blue", "light_pink", "dark_pink", "light_purple", "dark_purple",
    "reverse_pink", "reverse_purple"
  );
  answerSub.textContent = "";
  answerPos.textContent = "";
}

// ----------------------------------------------------------
// Exemples
// ----------------------------------------------------------

/**
 * Injecte les exemples de phrases dans la section dédiée.
 * @param {Array<{ ja: string, en: string }>} examples
 * @param {string} promptWord  Mot à mettre en gras dans les exemples
 */
function renderExamples(examples, promptWord) {
  examples.forEach(ex => {
    const wrap = document.createElement("div");
    wrap.className = "example-item";

    const jaDiv = document.createElement("div");
    jaDiv.className = "example-ja";
    jaDiv.innerHTML = highlightWord(ex.ja, promptWord);

    const enDiv = document.createElement("div");
    enDiv.className = "example-en";
    enDiv.textContent = ex.en;

    wrap.appendChild(jaDiv);
    wrap.appendChild(enDiv);
    answerExamples.appendChild(wrap);
  });
}

// ----------------------------------------------------------
// Items liés (kanji ↔ vocabulaire)
// ----------------------------------------------------------

/**
 * Affiche les kanji ou vocabulaires associés à la question.
 * @param {Object} q
 */
export function displayRelatedItems(q) {
  console.log("Displaying related items for", q);
  relatedContainer.innerHTML = "";

  let items     = [];
  let itemClass = "";

  if (q.object === "vocabulary") {
    items     = (q.vocab_to_kanji || []).map(id => window.ALL_SUBJECTS[id]).filter(Boolean);
    itemClass = "kanji-item";
  } else if (q.object === "kanji") {
    items     = (q.kanji_to_vocab || []).map(id => window.ALL_SUBJECTS[id]).filter(Boolean);
    itemClass = "vocab-item";
  }

  if (!items.length) {
    relatedBox.classList.add("hidden");
    return;
  }

  items.forEach(item => {
    const vignette = document.createElement("div");
    vignette.className = `related-item ${itemClass}`;
    vignette.innerHTML = `
      <div class="related-item-character">${item.characters}</div>
      <div class="related-item-meaning">${item.meanings[0]}</div>
      <div class="related-item-reading">${item.readings[0]}</div>
    `;
    relatedContainer.appendChild(vignette);
  });

  relatedBox.classList.remove("hidden");
}

// ----------------------------------------------------------
// Reset entre deux questions
// ----------------------------------------------------------

/**
 * Masque tous les éléments de la carte de réponse.
 */
export function resetAnswerArea() {
  mnemonicBox.classList.add("hidden");
  answerBox.classList.add("hidden");
  answerExamples.classList.add("hidden");
  answerExamples.innerHTML = "";
  answerPos.classList.add("hidden");
  relatedBox.classList.add("hidden");
}

// ----------------------------------------------------------
// Écran de résultat
// ----------------------------------------------------------

/**
 * Affiche l'écran de fin de quiz.
 */
export function showResultScreen() {
  const { correct, questions } = quizState;
  const percent = Math.round((correct / questions.length) * 100);

  questionEl.innerHTML   = `Quiz Completed!<br>${correct} / ${questions.length}`;
  kindEl.textContent     = "";
  headerProgress.textContent = "Done";
  headerScore.textContent    = `${percent}%`;

  input.classList.add("hidden");
  submitBtn.classList.add("hidden");
  continueBtn.classList.remove("hidden");
  retryBtn.classList.remove("hidden");
  returnBtn.classList.remove("hidden");

  updateScoreBadge();
}

/**
 * Prépare l'interface pour rejouer les cartes ratées.
 */
export function resetUIForRetry() {
  headerScore.textContent = "0%";
  submitBtn.textContent = "→";
  submitBtn.classList.remove("hidden");
  continueBtn.classList.add("hidden");
  retryBtn.classList.add("hidden");
  returnBtn.classList.add("hidden");
}

/**
 * Met à jour le texte du kindEl après une réponse.
 * @param {Object}  q
 * @param {boolean} isCorrect
 */
export function updateKindLabel(q, isCorrect) {
  const boolCorrect = isCorrect ? 1 : 0;
  kindEl.textContent =
    `${q.kind} (${q.correct + boolCorrect}/${q.attempts + 1})`;
}

/**
 * Met à jour le pourcentage dans le header score.
 */
export function updateHeaderScore() {
  const answered  = quizState.index + 1;
  const percent   = Math.round((quizState.correct / answered) * 100);
  headerScore.textContent = `${percent}%`;
}
