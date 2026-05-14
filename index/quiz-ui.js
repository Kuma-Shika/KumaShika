// ============================================================
//  quiz-ui.js  —  Quiz DOM rendering
//  All functions receive a `dom` refs object and a `qs`
//  (quizState) rather than reading globals.
//  Call injectQuizHTML(container) first, then getQuizDOMRefs().
// ============================================================

import { cleanText, highlightWord } from "../quiz/utils.js";
import { kanjiPillQuiz, vocabPillQuiz, radicalPillQuiz } from "../components/kanjiPill.js";
import { wordDetailContent } from "../components/wordDetailContent.js";
import { wordInformation } from "../components/wordInformation.js";



// ── HTML scaffold ─────────────────────────────────────────────

export function injectQuizHTML(container) {
  container.innerHTML = `
    <!-- Quiz header -->
    <div class="quiz-header" id="quiz-header">
      <div class="quiz-header-left">
        <div class="quiz-header-type"  id="quiz-header-type"></div>
        <div class="quiz-header-level" id="quiz-header-level"></div>
      </div>
      <div class="quiz-header-center">
        <img src="assets/logo_long.png" alt="KumaShika" style="width:160px;height:auto;cursor:pointer;" id="quiz-logo">
      </div>
      <div class="quiz-header-right">
        <div class="quiz-score-badge needs-work" id="quiz-score-badge">
          <span id="quiz-header-progress"></span>
          <span id="quiz-header-score">0%</span>
        </div>
      </div>
    </div>

    <!-- Question card -->
    <div class="quiz-card" id="quiz-card">
      <div class="quiz-kind"     id="quiz-kind"></div>
      <div class="quiz-question" id="quiz-question"></div>
    </div>

    <!-- Result panel (caché par défaut) -->
    <div id="quiz-result-panel" class="quiz-card hidden" style="text-align:center;color:white;"></div>

    <!-- Input + buttons -->
    <div class="quiz-input-container">
      <div class="quiz-input-wrapper">
        <input
          type="text"
          id="quiz-answer"
          class="quiz-answer-input"
          autocomplete="off"
          placeholder="Answer...">
        <div id="quiz-kanji-suggestions" class="quiz-kanji-suggestions hidden"></div>
      </div>
      <button id="quiz-submit-btn" class="quiz-submit-btn">→</button>
      <button id="quiz-continue-btn" class="quiz-submit-btn hidden">Continue</button>
      <button id="quiz-retry-btn"    class="quiz-submit-btn hidden">Retry</button>
      <button id="quiz-return-btn"   class="quiz-submit-btn hidden">← Home</button>
    </div>

    <!-- Answer box -->
    <div id="quiz-answer-box" class="quiz-answer-box hidden">
      <div id="quiz-answer-main" class="quiz-answer-main"></div>
      <div id="quiz-answer-sub"  class="quiz-answer-sub"></div>
      <div id="quiz-answer-pos"  class="quiz-answer-pos hidden"></div>
      <div id="quiz-answer-meta" class="quiz-answer-meta"></div>
    </div>

    <!-- Related items (kanji ↔ vocab vignettes) -->
    <div id="quiz-related-box" class="quiz-related-box hidden">
      <div class="quiz-related-container" id="quiz-related-container"></div>
    </div>

    <!-- Examples -->
    <div id="quiz-examples" class="quiz-examples hidden"></div>

    <!-- Mnemonic -->
    <div id="quiz-mnemonic-box" class="quiz-mnemonic-box hidden"></div>
  `;
}

// ── DOM refs ──────────────────────────────────────────────────

export function getQuizDOMRefs(container) {
  return {
    headerType: container.querySelector("#quiz-header-type"),
    headerLevel: container.querySelector("#quiz-header-level"),
    headerProgress: container.querySelector("#quiz-header-progress"),
    headerScore: container.querySelector("#quiz-header-score"),
    scoreBadge: container.querySelector("#quiz-score-badge"),
    card: container.querySelector("#quiz-card"),
    kindEl: container.querySelector("#quiz-kind"),
    questionEl: container.querySelector("#quiz-question"),
    input: container.querySelector("#quiz-answer"),
    suggestionsEl: container.querySelector("#quiz-kanji-suggestions"),
    answerBox: container.querySelector("#quiz-answer-box"),
    answerMain: container.querySelector("#quiz-answer-main"),
    answerSub: container.querySelector("#quiz-answer-sub"),
    answerPos: container.querySelector("#quiz-answer-pos"),
    answerMeta: container.querySelector("#quiz-answer-meta"),
    mnemonicBox: container.querySelector("#quiz-mnemonic-box"),
    answerExamples: container.querySelector("#quiz-examples"),
    relatedBox: container.querySelector("#quiz-related-box"),
    relatedContainer: container.querySelector("#quiz-related-container"),
    submitBtn: container.querySelector("#quiz-submit-btn"),
    continueBtn: container.querySelector("#quiz-continue-btn"),
    retryBtn: container.querySelector("#quiz-retry-btn"),
    returnBtn: container.querySelector("#quiz-return-btn"),
    resultPanel: container.querySelector("#quiz-result-panel"),
  };
}

// ── Header ────────────────────────────────────────────────────

export function initHeader(dom, label, levelText) {
  dom.headerType.textContent = label.toUpperCase();
  dom.headerLevel.textContent = levelText;
}

export function updateHeader(dom, qs, mode, limit) {
  if (mode === "daily") {
    dom.headerProgress.textContent = `${qs.newWordsCorrect} / ${limit ?? 60}`;
  } else if (mode === "reviews") {
    dom.headerProgress.textContent = `${qs.reviewsCorrect} / ${qs.totalReviews}`;
  } else {
    dom.headerProgress.textContent = `${qs.index + 1} / ${qs.questions.length}`;
  }
}

// ── Score badge ───────────────────────────────────────────────

export function updateScoreBadge(dom, qs) {
  if (!qs.total) return;
  const percent = Math.round((qs.correct / qs.total) * 100);
  dom.scoreBadge.classList.remove("excellent", "good", "needs-work");
  if (percent >= 80) dom.scoreBadge.classList.add("excellent");
  else if (percent >= 60) dom.scoreBadge.classList.add("good");
  else dom.scoreBadge.classList.add("needs-work");
  dom.headerScore.textContent = `${percent}%`;
}

// ── Question ──────────────────────────────────────────────────

export function showQuestion(dom, qs) {
  dom.input.value = "";
  dom.input.className = "quiz-answer-input";
  dom.input.readOnly = false;
  dom.input.focus();

  qs.awaitingNext = false;

  if (qs.index >= qs.questions.length) return;

  const q = qs.questions[qs.index];
  dom.questionEl.textContent = q.prompt;
  dom.kindEl.textContent = `${q.kind} (${q.correct}/${q.attempts})`;
  dom.card.className = `quiz-card ${q.object}-${q.kind}`;
}

// ── Word overlay (clique sur pastille pendant quiz) ───────────

export function showWordOverlay(wordId, navigate) {
  const existing = document.getElementById("quiz-word-overlay");
  if (existing) existing.remove();

  const item = window.ALL_SUBJECTS[wordId];
  if (!item) return;

  const isKanji = item.object === "kanji";

  // ── Backdrop semi-transparent ────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.id = "quiz-word-overlay";
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(135, 31, 31, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: flex-end;
    overflow: hidden;
  `;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };

  // ── Bottom sheet ─────────────────────────────────────────────
  const sheet = document.createElement("div");
  sheet.className = "grid grid-level-select";
  sheet.style.cssText = `
    width: 100%; max-height: 88dvh; overflow-y: auto;
    border-radius: 20px 20px 0 0;
    padding: 8px 16px 32px; box-sizing: border-box;
    transform: translateY(100%);
    transition: transform .25s cubic-bezier(.32,1,.4,1);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  `;

  const close = () => {
    document.body.style.overflow = "";   // ← ajouter ça
    sheet.style.transform = "translateY(100%)";
    setTimeout(() => backdrop.remove(), 240);
  };

  // Drag handle visuel
  const handle = document.createElement("div");
  handle.style.cssText = `
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.18);
    margin: 8px auto 12px; flex-shrink: 0;
  `;

  // Bouton retour
  const backBtn = document.createElement("button");
  backBtn.className = "btn btn-back";
  backBtn.textContent = "← Quiz";
  backBtn.onclick = close;

  // Carte principale — identique à renderWordDetail
  const cardEl = document.createElement("div");
  cardEl.className = isKanji ? "wd-card wd-card--kanji" : "wd-card wd-card--vocab";
  cardEl.innerHTML = `
    <div class="wd-kind">${isKanji ? "KANJI" : "VOCABULARY"}</div>
    <div class="wd-character">${item.characters}</div>
  `;

  const answerEl = document.createElement("div");
  answerEl.className = isKanji ? "wd-answer wd-answer--kanji" : "wd-answer wd-answer--vocab";
  const metaParts = [];
  if (item.jlpt) metaParts.push(`<span class="quiz-meta-badge quiz-meta-jlpt">${item.jlpt}</span>`);
  if (item.frequency && item.object === "vocabulary" && item.frequency) metaParts.push(`<span class="quiz-meta-badge quiz-meta-freq">, </span>`);
  if (item.frequency && item.object === "vocabulary") metaParts.push(`<span class="quiz-meta-badge quiz-meta-freq">#${item.frequency}</span>`);
  answerEl.innerHTML = `
    <div class="wd-main">${item.meanings.join(", ")}</div>
    <div class="wd-sub">${(item.readings ?? []).join(", ")}</div>
    ${item.part_of_speech?.length ? `<div class="wd-pos">${item.part_of_speech.join(", ")}</div>` : ""}
    ${metaParts.length ? `<div class="quiz-answer-meta">${metaParts.join("")}</div>` : ""}
  `;

  sheet.appendChild(handle);
  sheet.appendChild(backBtn);
  sheet.appendChild(cardEl);
  sheet.appendChild(answerEl);

  try {
    sheet.appendChild(wordInformation(item, {
      getSubject: (id) => window.ALL_SUBJECTS[id],
      onNavigate: (id) => showWordOverlay(id, navigate),
    }));
  } catch { }

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";


  // Slide-in après le premier paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = "translateY(0)";
  }));
}

// ── Answer card ───────────────────────────────────────────────

export function displayAnswerCard(dom, q, navigate) {
  clearAnswerCard(dom);

  const answersText = cleanText(q.answers.join(", "));

  switch (`${q.object}:${q.kind}`) {
    case "radical:meaning":
      renderAnswerCard(dom, {
        main: answersText, color: "blue",
        mnemonic: q.meaning_mnemonic
      });
      break;
    case "kanji:meaning":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.readings.join(", ")),
        color: "light_pink", mnemonic: q.meaning_mnemonic
      });
      break;
    case "kanji:reading":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.meanings.join(", ")),
        color: "dark_pink", mnemonic: q.reading_mnemonic
      });
      break;
    case "kanji:reverse":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.readings.join(", ")),
        color: "reverse_pink", mnemonic: q.reading_mnemonic, showExamples: true
      });
      break;
    case "vocabulary:meaning":
    case "kana_vocabulary:meaning":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.readings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "light_purple", mnemonic: q.meaning_mnemonic, showExamples: true
      });
      break;
    case "vocabulary:reading":
    case "kana_vocabulary:reading":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.meanings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "dark_purple", mnemonic: q.reading_mnemonic, showExamples: true
      });
      break;
    case "vocabulary:reverse":
    case "kana_vocabulary:reverse":
      renderAnswerCard(dom, {
        main: answersText, sub: cleanText(q.readings.join(", ")),
        pos: cleanText(q.part_of_speech),
        color: "reverse_purple", mnemonic: q.reading_mnemonic, showExamples: true
      });
      break;
  }

  const item = window.ALL_SUBJECTS[q.id];
  if (item) {
    // ── JLPT + fréquence ─────────────────────────────────────
    const metaParts = [];
    if (item.jlpt) metaParts.push(`<span class="quiz-meta-badge quiz-meta-jlpt">${item.jlpt}</span>`);
    if (item.frequency && item.object === "vocabulary" && item.frequency) metaParts.push(`<span class="quiz-meta-badge quiz-meta-freq">, </span>`);
    if (item.frequency && item.object === "vocabulary") metaParts.push(`<span class="quiz-meta-badge quiz-meta-freq">#${item.frequency}</span>`);
    dom.answerMeta.innerHTML = metaParts.join("");

    dom.relatedContainer.innerHTML = "";
    dom.relatedContainer.appendChild(
      wordInformation(item, {
        getSubject: (id) => window.ALL_SUBJECTS[id],
        onNavigate: navigate ? (id) => showWordOverlay(id, navigate) : null,
        occurrences: q.occurrences,
      })
    );
    dom.relatedBox.classList.remove("hidden");
  }
}

function renderAnswerCard(dom, { main, sub, pos, color, mnemonic, showExamples = false }) {
  dom.answerMain.textContent = main;
  if (sub) dom.answerSub.textContent = sub;
  if (pos) { dom.answerPos.textContent = pos; dom.answerPos.classList.remove("hidden"); }

  dom.answerBox.classList.remove("hidden");
  dom.answerBox.classList.add(color);
  dom.mnemonicBox.classList.remove("hidden");
  dom.mnemonicBox.textContent = cleanText(mnemonic);

  if (showExamples) dom.answerExamples.classList.remove("hidden");
}

function clearAnswerCard(dom) {
  dom.answerBox.classList.remove(
    "blue", "light_pink", "dark_pink", "light_purple", "dark_purple",
    "reverse_pink", "reverse_purple"
  );
  dom.answerSub.textContent = "";
  dom.answerPos.textContent = "";
  dom.answerMeta.innerHTML = "";
}

// ── Examples ──────────────────────────────────────────────────

function renderExamples(dom, examples, promptWord) {
  examples.forEach(ex => {
    const wrap = document.createElement("div");
    wrap.className = "quiz-example-item";

    const jaDiv = document.createElement("div");
    jaDiv.className = "quiz-example-ja";
    jaDiv.innerHTML = highlightWord(ex.ja, promptWord);

    const enDiv = document.createElement("div");
    enDiv.className = "quiz-example-en";
    enDiv.textContent = ex.en;

    wrap.appendChild(jaDiv);
    wrap.appendChild(enDiv);
    dom.answerExamples.appendChild(wrap);
  });
}

// ── Related items ─────────────────────────────────────────────

export function displayRelatedItems(dom, q) {
  dom.relatedContainer.innerHTML = "";

  const subject = window.ALL_SUBJECTS[q.id];

  if (q.object === "vocabulary") {
    const kanjis = (q.vocab_to_kanji || [])
      .map(id => window.ALL_SUBJECTS[id])
      .filter(Boolean);

    if (!kanjis.length) { dom.relatedBox.classList.add("hidden"); return; }

    kanjis.forEach(item => dom.relatedContainer.appendChild(kanjiPillQuiz(item)));

  } else if (q.object === "kanji") {
    const radicals = (subject?.radical_from_kanji || [])
      .map(id => window.ALL_SUBJECTS[id])
      .filter(Boolean);

    const vocabs = (q.kanji_to_vocab || [])
      .map(id => window.ALL_SUBJECTS[id])
      .filter(Boolean)
      .sort((a, b) => (a.frequency ?? Infinity) - (b.frequency ?? Infinity));

    if (!radicals.length && !vocabs.length) {
      dom.relatedBox.classList.add("hidden");
      return;
    }

    radicals.forEach(item => dom.relatedContainer.appendChild(radicalPillQuiz(item)));

    if (radicals.length && vocabs.length) {
      const spacer = document.createElement("div");
      spacer.style.cssText = "width:100%;height:16px;";
      dom.relatedContainer.appendChild(spacer);
    }

    vocabs.forEach(item => dom.relatedContainer.appendChild(vocabPillQuiz(item)));
  }

  dom.relatedBox.classList.remove("hidden");
}
// ── Reset between questions ───────────────────────────────────

export function resetAnswerArea(dom) {
  dom.mnemonicBox.classList.add("hidden");
  dom.answerBox.classList.add("hidden");
  dom.answerExamples.classList.add("hidden");
  dom.answerExamples.innerHTML = "";
  dom.answerPos.classList.add("hidden");
  dom.relatedBox.classList.add("hidden");
}

// ── Kind label after answer ───────────────────────────────────

export function updateKindLabel(dom, q, isCorrect) {
  const boolCorrect = isCorrect ? 1 : 0;
  dom.kindEl.textContent =
    `${q.kind} (${q.correct + boolCorrect}/${q.attempts + 1})`;
}

// ── Result screen ─────────────────────────────────────────────

export function showResultScreen(dom, qs, onRetry, onContinue, onReturn) {
  const { correct, questions } = qs;
  const percent = Math.round((correct / questions.length) * 100);

  dom.resultPanel.innerHTML = `
    <div style="padding:24px;">
      <div style="font-size:1.8em;font-weight:800;margin-bottom:8px;">Quiz Completed!</div>
      <div style="font-size:3em;font-weight:800;">${correct} / ${questions.length}</div>
      <div style="font-size:1.2em;opacity:0.85;margin-top:8px;">${percent}%</div>
    </div>
  `;
  dom.resultPanel.style.background = percent >= 80
    ? "linear-gradient(135deg, #10b981, #059669)"
    : percent >= 60
      ? "linear-gradient(135deg, #f59e0b, #d97706)"
      : "linear-gradient(135deg, #ef4444, #dc2626)";

  dom.card.classList.add("hidden");
  dom.resultPanel.classList.remove("hidden");

  dom.headerProgress.textContent = "Done";
  dom.headerScore.textContent = `${percent}%`;

  dom.input.classList.add("hidden");
  dom.submitBtn.classList.add("hidden");
  dom.continueBtn.classList.remove("hidden");
  dom.retryBtn.classList.remove("hidden");
  dom.returnBtn.classList.remove("hidden");

  dom.continueBtn.onclick = onContinue;
  dom.retryBtn.onclick = onRetry;
  dom.returnBtn.onclick = onReturn;

  updateScoreBadge(dom, qs);
}

export function resetUIForRetry(dom) {
  dom.resultPanel.classList.add("hidden");
  dom.card.classList.remove("hidden");
  dom.card.style.background = "";

  dom.headerScore.textContent = "0%";

  dom.input.classList.remove("hidden");
  dom.input.readOnly = false;

  dom.submitBtn.classList.remove("hidden");
  dom.continueBtn.classList.add("hidden");
  dom.retryBtn.classList.add("hidden");
  dom.returnBtn.classList.add("hidden");
}

// ── Kanji suggestions UI ──────────────────────────────────────

export function showKanjiSuggestions(dom, qs, kanjis) {
  dom.suggestionsEl.innerHTML = "";
  qs.currentSuggestions = kanjis;

  if (!kanjis.length) {
    hideKanjiSuggestions(dom, qs);
    return;
  }

  qs.suggestionIndex = 0;

  kanjis.forEach((k, i) => {
    const div = document.createElement("div");
    div.className = "quiz-kanji-option";
    div.textContent = k;
    if (i === 0) div.classList.add("selected");

    div.addEventListener("click", () => {
      dom.input.value = k;
      hideKanjiSuggestions(dom, qs);
    });

    dom.suggestionsEl.appendChild(div);
  });

  dom.suggestionsEl.classList.remove("hidden");
  renderKanjiSelection(dom, qs);
}

export function hideKanjiSuggestions(dom, qs) {
  dom.suggestionsEl.classList.add("hidden");
  qs.suggestionIndex = -1;
  qs.currentSuggestions = [];
}

export function renderKanjiSelection(dom, qs) {
  [...dom.suggestionsEl.children].forEach((el, i) => {
    const isSelected = i === qs.suggestionIndex;
    el.classList.toggle("selected", isSelected);
    if (isSelected) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

export function selectNextSuggestion(dom, qs) {
  const len = qs.currentSuggestions.length;
  if (!len) return;
  qs.suggestionIndex = (qs.suggestionIndex + 1) % len;
  renderKanjiSelection(dom, qs);
}

export function selectPrevSuggestion(dom, qs) {
  const len = qs.currentSuggestions.length;
  if (!len) return;
  qs.suggestionIndex = (qs.suggestionIndex - 1 + len) % len;
  renderKanjiSelection(dom, qs);
}