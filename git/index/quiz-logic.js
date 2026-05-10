// ============================================================
//  quiz-logic.js  —  Quiz orchestration
//  Single export: renderQuizInContainer(container, quizParams, userData, navigate)
// ============================================================

import { VIEWS } from "./config.js";
import { fetchUserCards, fetchOwnLevels, updateCardProgress, markLevelSuccess, incrementStreakNew, incrementStreakReviews, setCardKnown }
  from "./db.js";
import { buildQuestions, prioritizeQuestions } from "../quiz/quiz-builder.js";
import { loadJapaneseMaps, romajiToKana, kanaToKanji, maps } from "../quiz/japanese.js";
import { normalize, isCloseEnough, regardlessKana, shuffle } from "../quiz/utils.js";
import { freshQuizState } from "./quiz-state.js";
import {
  injectQuizHTML, getQuizDOMRefs,
  initHeader, updateHeader,
  showQuestion, displayAnswerCard,
  resetAnswerArea, showResultScreen,
  resetUIForRetry, updateKindLabel,
  updateHeaderScore, updateScoreBadge,
  showKanjiSuggestions, hideKanjiSuggestions,
  selectNextSuggestion, selectPrevSuggestion,
} from "./quiz-ui.js";
import { fetchJSON } from "../utils/fetch.js";

// ── Decode quizParams ─────────────────────────────────────────

function decodeParams(quizParams) {
  const BUTTON_CONFIG = [
    ["radical",    "Radical",    "meaning"],
    ["kanji",      "Kanji",      "meaning"],
    ["kanji",      "Kanji",      "reading"],
    ["kanji",      "Kanji",      "reverse"],
    ["vocabulary", "Vocabulary", "meaning"],
    ["vocabulary", "Vocabulary", "reading"],
    ["vocabulary", "Vocabulary", "reverse"],
  ];

  if (quizParams.mode === "reviews") {
    return { type: "reviews", label: "SRS", levelText: "Reviews", exercise: null };
  }

  const rawKey   = quizParams.levelKey ?? quizParams.ownKey ?? "1-1";
  const indexStr = rawKey.split("-").pop();
  const typeIndex = Math.max(0, parseInt(indexStr, 10) - 1);
  const cfg = BUTTON_CONFIG[typeIndex] ?? BUTTON_CONFIG[0];

  if (quizParams.mode === "level") {
    const [lvl] = rawKey.split("-");
    return {
      type:      cfg[0],
      label:     cfg[0],
      levelText: `Level ${lvl} — ${cfg[1]}`,
      exercise:  cfg[2],
      levelKey:  rawKey,
      levelNum:  lvl,
    };
  }

  if (quizParams.mode === "jlpt") {
    const type = quizParams.progressType ?? "kanji";
    return {
      type,
      label:        type,
      levelText:    `JLPT ${quizParams.jlptLevel} — ${type}`,
      exercise:     quizParams.exerciseType ?? "meaning",
      jlptLevel:    quizParams.jlptLevel,
      progressType: type,
    };
  }

  // own mode
  const ownName = decodeURIComponent(rawKey.split("-").slice(0, -1).join("-"));
  return {
    type:      cfg[0],
    label:     cfg[0],
    levelText: `${ownName} — ${cfg[1]}`,
    exercise:  cfg[2],
    ownName,
    ownKey:    rawKey,
  };
}

// ── Entry point ───────────────────────────────────────────────

export async function renderQuizInContainer(container, quizParams, userData, navigate) {
  injectQuizHTML(container);
  const dom = getQuizDOMRefs(container);
  dom.container = container;
  const qs = freshQuizState();

  const decoded = decodeParams(quizParams);
  initHeader(dom, decoded.label, decoded.levelText);

  await loadJapaneseMaps();

  try {
    await loadData(qs, quizParams, decoded);
  } catch (err) {
    console.error("Quiz load error:", err);
    container.innerHTML = `<p style="color:white;text-align:center;padding:40px;">Failed to load quiz data.</p>`;
    return;
  }

  const eventsController = bindEvents(dom, qs, quizParams, decoded, navigate);

  const quit = () => {
    eventsController.abort();
    navigate(VIEWS.MAIN);
  };

  dom.returnBtn.onclick                              = quit;
  container.querySelector("#quiz-logo").onclick      = quit;

  updateHeader(dom, qs);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

// ── Data loading ──────────────────────────────────────────────

async function attachCardStats(questions, exercise) {
  const cardsData = await fetchUserCards();
  if (!cardsData) return;

  for (const q of questions) {
    const cardEntry = cardsData[q.id];
    const typeEntry = cardEntry?.[exercise];
    q.attempts    = typeEntry?.attempts    || 0;
    q.correct     = typeEntry?.correct     || 0;
    q.occurrences = cardEntry?.occurrences || [];
    q.known       = cardEntry?.known       || false;
  }
}

async function applySettingsToQuestions(questions, quizParams) {
  // 1. Filtrer les known si demandé
  //    (q.known doit être attaché avant d'appeler cette fonction)
  if (quizParams.includeKnown === false) {
    questions = questions.filter(q => !q.known);
  }

  // 2. Ordre
  if (quizParams.order === "difficulty") {
    questions.sort((a, b) => scoreCard(a) - scoreCard(b));
  } else {
    shuffle(questions);
  }

  // 3. Longueur
  if (quizParams.length) {
    questions = questions.slice(0, quizParams.length);
  }

  return questions;
}

async function loadData(qs, quizParams, decoded) {

  // ── Level ──────────────────────────────────────────────────
  if (quizParams.mode === "level") {
    const ids    = await fetchJSON(`id_per_level/${decoded.levelNum}_${decoded.type}.json`);
    qs.questions = await buildQuestions(ids, decoded.exercise);
    await attachCardStats(qs.questions, decoded.exercise);
    qs.questions = await applySettingsToQuestions(qs.questions, quizParams);
    return;
  }

  // ── JLPT ───────────────────────────────────────────────────
  if (quizParams.mode === "jlpt") {
    const type     = quizParams.progressType ?? "kanji";
    const typeFile = (type === "vocabulary" || type === "vocab") ? "vocab" : "kanji";
    const ids      = await fetchJSON(`id_per_jlpt/${quizParams.jlptLevel}_${typeFile}.json`);
    qs.questions   = await buildQuestions(ids, decoded.exercise);
    await attachCardStats(qs.questions, decoded.exercise);
    qs.questions   = await applySettingsToQuestions(qs.questions, quizParams);
    return;
  }

  // ── Own ────────────────────────────────────────────────────
  if (quizParams.mode === "own") {
    const ownName   = decoded.ownName;
    const ownLevels = await fetchOwnLevels() || {};
    let ids;

    if (ownLevels[ownName]) {
      ids = ownLevels[ownName];
    } else {
      for (const folder of Object.values(ownLevels)) {
        if (folder.children?.[ownName]) { ids = folder.children[ownName]; break; }
      }
    }

    if (!ids) throw new Error(`Own level not found: ${ownName}`);

    qs.questions = await buildQuestions(ids[decoded.type] ?? [], decoded.exercise);
    await attachCardStats(qs.questions, decoded.exercise);
    qs.questions = await applySettingsToQuestions(qs.questions, quizParams);
    return;
  }

  // ── Reviews ────────────────────────────────────────────────
  if (quizParams.mode === "reviews") {
    const cardsData = await fetchUserCards();
    if (!cardsData) throw new Error("No cards");

    const TYPES = ["meaning", "reading", "reverse"];

    const userCards = await Promise.all(
      Object.entries(cardsData).flatMap(([id, cardEntry]) =>
        TYPES
          .filter(type => cardEntry[type])
          .map(async type => {
            const built = await buildQuestions([id], type);
            if (!built?.length) return null;
            return {
              ...built[0],
              attempts:    cardEntry[type].attempts    || 0,
              correct:     cardEntry[type].correct     || 0,
              occurrences: cardEntry.occurrences       || [],
              known:       cardEntry.known             || false,
              cardId:      `${id}-${type}`,
            };
          })
      )
    );

    const filtered   = userCards.filter(Boolean);
    const prioritized = prioritizeQuestions(filtered).slice(0, 50);
    qs.questions     = await applySettingsToQuestions(prioritized, quizParams);
  }
}

// ── Quiz flow ─────────────────────────────────────────────────

function showCurrentQuestion(dom, qs, quizParams, decoded, navigate) {
  if (qs.index >= qs.questions.length) {
    handleQuizEnd(dom, qs, quizParams, decoded, navigate);
    return;
  }
  showQuestion(dom, qs);
}

function checkAnswer(q, userAnswer) {
  if (q.kind === "meaning") {
    return q.answers.some(a => isCloseEnough(normalize(a), userAnswer));
  }
  return q.answers.some(a => regardlessKana(normalize(a), userAnswer, maps.allToHiragana));
}

async function handleSubmit(dom, qs, quizParams, decoded, navigate) {
  const q = qs.questions[qs.index];
  if (!q) return;

  if (q.kind !== "meaning" && dom.input.value.endsWith("n")) {
    dom.input.value = dom.input.value.slice(0, -1) + "ん";
  }

  // ── First press: evaluate ──
  if (!qs.awaitingNext) {
    qs.awaitingNext = true;
    const userAnswer = normalize(dom.input.value);
    const isCorrect  = checkAnswer(q, userAnswer);

    if (isCorrect) {
      dom.input.classList.add("correct");
      qs.correct++;
    } else {
      dom.input.classList.add("wrong");
      qs.failedCards.push(q);
    }

    displayAnswerCard(dom, q);
    updateKindLabel(dom, q, isCorrect);
    updateHeaderScore(dom, qs);
    updateScoreBadge(dom, qs);
    dom.input.readOnly = true;

    // Bouton "Mark as known"
    dom.container.querySelector("#quiz-known-btn")?.remove();
    const knownBtn = document.createElement("button");
    knownBtn.id        = "quiz-known-btn";
    knownBtn.className = `btn own-study-btn ${q.known ? "known-btn--active" : "known-btn--inactive"}`;
    knownBtn.innerHTML = `<div class="level">${q.known ? "✅ Known" : "○ Mark as known"}</div>`;
    knownBtn.onclick   = async () => {
      await setCardKnown(q.id);
      q.known        = true;
      knownBtn.className = "btn own-study-btn known-btn--active";
      knownBtn.innerHTML = `<div class="level">✅ Known</div>`;
    };
    dom.container.appendChild(knownBtn);

    updateCardProgress(q, isCorrect);
    return;
  }

  // ── Second press: advance ──
  qs.index++;
  dom.container.querySelector("#quiz-known-btn")?.remove();
  updateHeader(dom, qs);
  resetAnswerArea(dom);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

function retryFailedCards(dom, qs, quizParams, decoded, navigate) {
  if (!qs.failedCards.length) return;

  qs.index       = 0;
  qs.questions   = qs.failedCards;
  qs.failedCards = [];
  qs.correct     = 0;
  qs.redid       = true;

  resetUIForRetry(dom);
  updateHeader(dom, qs);
  resetAnswerArea(dom);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

async function handleQuizEnd(dom, qs, quizParams, decoded, navigate) {
  if (quizParams.mode === "reviews") {
    incrementStreakReviews();
  } else if (!qs.redid && quizParams.mode === "level") {
    markLevelSuccess(decoded.levelKey);
    incrementStreakNew();
  }

  showResultScreen(
    dom, qs,
    () => window.location.reload(),
    () => retryFailedCards(dom, qs, quizParams, decoded, navigate),
    () => navigate(VIEWS.MAIN)
  );
}

// ── Event binding ─────────────────────────────────────────────

function bindEvents(dom, qs, quizParams, decoded, navigate) {
  const controller = new AbortController();
  const { signal } = controller;

  dom.submitBtn.addEventListener("click", () =>
    handleSubmit(dom, qs, quizParams, decoded, navigate)
  );

  dom.input.addEventListener("keydown", e => {
    if (dom.suggestionsEl.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); selectNextSuggestion(dom, qs); }
    if (e.key === "ArrowUp")   { e.preventDefault(); selectPrevSuggestion(dom, qs); }
  });

  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["Tab", "Escape", "F5"].includes(e.key)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (!dom.suggestionsEl.classList.contains("hidden") && qs.suggestionIndex >= 0) {
        dom.input.value = qs.kanjiOnly + qs.currentSuggestions[qs.suggestionIndex];
        hideKanjiSuggestions(dom, qs);
        dom.input.focus();
        return;
      }
      handleSubmit(dom, qs, quizParams, decoded, navigate);
      return;
    }

    if (document.activeElement !== dom.input && !dom.input.readOnly) {
      dom.input.focus();
    }
  }, { signal });

  dom.input.addEventListener("input", () => {
    if (!qs.questions.length) return;

    const q   = qs.questions[qs.index];
    const raw = dom.input.value.toLowerCase();
    dom.input.value = raw;

    if (q.kind !== "meaning") {
      const kana = romajiToKana(raw);
      dom.input.value = kana;

      if (q.kind === "reverse") {
        const validKana = Object.values(maps.romajiToKana);
        const kanaOnly  = kana.split("").filter(c =>  validKana.includes(c)).join("");
        qs.kanjiOnly    = kana.split("").filter(c => !validKana.includes(c)).join("");
        showKanjiSuggestions(dom, qs, kanaToKanji(kanaOnly));
      }
    }
  });

  document.addEventListener("click", e => {
    if (!dom.input.contains(e.target) && !dom.suggestionsEl.contains(e.target)) {
      hideKanjiSuggestions(dom, qs);
    }
  }, { signal });

  return controller;
}

// ── Scoring ───────────────────────────────────────────────────

function scoreCard(q) {
  if (q.known) return 1000 + Math.random() * 10;
  if (!q.attempts || q.attempts === 0) return -1 + Math.random() * 0.1;

  const ratio   = q.correct / q.attempts;
  const urgency = (1 - ratio) * Math.log(q.attempts + 1);
  return 1 + ratio - urgency + Math.random() * 0.15;
}