// ============================================================
//  quiz-logic.js  —  Quiz orchestration
//  Single export: renderQuizInContainer(container, quizParams, userData, navigate)
//  Mirrors main.js but works inside #grid instead of quiz.html.
// ============================================================

import { VIEWS }                    from "./config.js";
import { dbGet, currentUser, updateCardProgress, markLevelSuccess, incrementStreakNew, incrementStreakReviews, setCardKnown }
  from "./db.js";
import { buildQuestions, prioritizeQuestions } from "../quiz/quiz-builder.js";
import { loadJapaneseMaps, romajiToKana, kanaToKanji, maps } from "../quiz/japanese-standalone.js";
import { normalize, isCloseEnough, regardlessKana, shuffle } from "../quiz/utils.js";
import { freshQuizState }           from "./quiz-state.js";
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

// ── Decode quizParams into a level key, type, exercise ───────

function decodeParams(quizParams) {
  // BUTTON_CONFIG mirrors state.js in the quiz folder
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

  // level mode:  levelKey = "3-2"  → index 1 → BUTTON_CONFIG[1]
  // own mode:    ownKey   = "MyText-5" → index 4 → BUTTON_CONFIG[4]
  const rawKey = quizParams.levelKey ?? quizParams.ownKey ?? "1-1";
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
  dom.container = container; // ← ajoute cette ligne
  const qs  = freshQuizState();

  const decoded = decodeParams(quizParams);
  initHeader(dom, decoded.label, decoded.levelText);

  // Return button always goes home
  dom.returnBtn.onclick = () => navigate(VIEWS.MAIN);

  // Wire logo click → home
  container.querySelector("#quiz-logo").onclick = () => navigate(VIEWS.MAIN);

  // Load data then start
  try {
    await loadData(qs, quizParams, decoded);
  } catch (err) {
    console.error("Quiz load error:", err);
    container.innerHTML = `<p style="color:white;text-align:center;padding:40px;">Failed to load quiz data.</p>`;
    return;
  }

  updateHeader(dom, qs);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
  bindEvents(dom, qs, quizParams, decoded, navigate);
}

// ── Data loading ──────────────────────────────────────────────

// ── Data loading ──────────────────────────────────────────────

async function attachCardStats(questions, exercise) {
  const username = currentUser();
  if (!username) return;

  const snap = await dbGet(`users/${username}`);
  if (!snap.exists()) return;

  const cardsData = snap.data().cards;
  if (!cardsData) return;

  for (const q of questions) {
    console.log("Attaching stats for question:", q.id, exercise, cardsData[q.id]);
    const cardEntry = cardsData[q.id];
    const typeEntry = cardEntry?.[exercise];
    q.attempts    = typeEntry?.attempts    || 0;
    q.correct     = typeEntry?.correct     || 0;
    q.occurrences = cardEntry?.occurrences || [];
    q.known       = cardEntry?.known       || false;
  }
}

async function loadData(qs, quizParams, decoded) {
  if (quizParams.mode === "level") {
    const response = await fetch(`id_per_level/${decoded.levelNum}_${decoded.type}.json`);
    const ids = await response.json();
    qs.questions = await buildQuestions(ids, decoded.exercise);
    shuffle(qs.questions);
    await attachCardStats(qs.questions, decoded.exercise);
    return;
  }

  if (quizParams.mode === "jlpt") {
    const response = await fetch(`id_per_jlpt/${quizParams.jlptLevel}.json`);
    const allIds = await response.json();
    const type = quizParams.progressType;
    const ids = type
      ? allIds.filter(id => {
          const item = window.ALL_SUBJECTS[id];
          if (!item) return false;
          if (type === "kanji")      return item.object === "kanji";
          if (type === "vocabulary") return item.object === "vocabulary" || item.object === "kana_vocabulary";
          return true;
        })
      : allIds;
    qs.questions = await buildQuestions(ids, decoded.exercise);
    shuffle(qs.questions);
    await attachCardStats(qs.questions, decoded.exercise);
    return;
  }

  if (quizParams.mode === "own") {
    const snap = await dbGet(`users/${currentUser()}`);
    const data = snap.data();
    const ownName = decoded.ownName;

    let ids;
    const ownLevels = data.ownLevels || {};
    if (ownLevels[ownName]) {
      ids = ownLevels[ownName];
    } else {
      for (const folder of Object.values(ownLevels)) {
        if (folder.children?.[ownName]) {
          ids = folder.children[ownName];
          break;
        }
      }
    }

    if (!ids) throw new Error(`Own level not found: ${ownName}`);

    qs.questions = await buildQuestions(ids[decoded.type] ?? [], decoded.exercise);
    shuffle(qs.questions);
    await attachCardStats(qs.questions, decoded.exercise);
    return;
  }

  if (quizParams.mode === "reviews") {
    const username = currentUser();
    if (!username) throw new Error("Not logged in");

    const snap = await dbGet(`users/${username}`);
    if (!snap.exists()) throw new Error("User not found");

    const cardsData = snap.data().cards;
    if (!cardsData) throw new Error("No cards");

    const TYPES = ["meaning", "reading", "reverse"];

    const userCards = await Promise.all(
      Object.entries(cardsData).flatMap(([id, cardEntry]) =>
        TYPES
          .filter(type => cardEntry[type])
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

    qs.questions = prioritizeQuestions(userCards.filter(Boolean)).slice(0, 50);
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
  console.log("User answer:", dom.input.value, " | Correct answers:", q.answers);

  // Convert trailing "n" → ん for reading/reverse
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
    const existingKnownBtn = dom.container.querySelector("#quiz-known-btn");
    if (existingKnownBtn) existingKnownBtn.remove();

    const isKnown = q.known === true;
    const knownBtn = document.createElement("button");
    knownBtn.id = "quiz-known-btn";
    knownBtn.className = `btn own-study-btn ${isKnown ? "known-btn--active" : "known-btn--inactive"}`;
    knownBtn.innerHTML = `<div class="level">${isKnown ? "✅ Known" : "○ Mark as known"}</div>`;
    knownBtn.id = "quiz-known-btn";
    knownBtn.className = `btn own-study-btn ${isKnown ? "known-btn--active" : "known-btn--inactive"}`;
    knownBtn.innerHTML = `<div class="level">${isKnown ? "✅ Known" : "○ Mark as known"}</div>`;
// pas de style.cssText
    knownBtn.onclick = async () => {
      await setCardKnown(currentUser(), q.id);
      q.known = true;
      knownBtn.className = "btn own-study-btn known-btn--active";
      knownBtn.innerHTML = `<div class="level">✅ Known</div>`;
    };
    dom.container.appendChild(knownBtn);

    // Persist asynchronously
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

  qs.index      = 0;
  qs.questions  = qs.failedCards;
  qs.failedCards = [];
  qs.correct    = 0;
  qs.redid      = true;

  resetUIForRetry(dom);
  updateHeader(dom, qs);
  resetAnswerArea(dom);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

async function handleQuizEnd(dom, qs, quizParams, decoded, navigate) {
  // Fire-and-forget streak/level updates
  if (quizParams.mode === "reviews") {
    incrementStreakReviews();
  } else if (!qs.redid && quizParams.mode === "level") {
    markLevelSuccess(decoded.levelKey);
    incrementStreakNew();
  }

  showResultScreen(
    dom, qs,
    // Retry
    () => window.location.reload(),
    // Continue (retry failed cards)
    () => retryFailedCards(dom, qs, quizParams, decoded, navigate),
    // Return home
    () => navigate(VIEWS.MAIN)
  );
}

// ── Event binding ─────────────────────────────────────────────

function bindEvents(dom, qs, quizParams, decoded, navigate) {
  dom.submitBtn.addEventListener("click", () =>
    handleSubmit(dom, qs, quizParams, decoded, navigate)
  );

  // Arrow key navigation in suggestions
  dom.input.addEventListener("keydown", e => {
    if (dom.suggestionsEl.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); selectNextSuggestion(dom, qs); }
    if (e.key === "ArrowUp")   { e.preventDefault(); selectPrevSuggestion(dom, qs); }
  });

  // Global keydown
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["Tab", "Escape", "F5"].includes(e.key)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      // Validate selected kanji suggestion
      if (!dom.suggestionsEl.classList.contains("hidden") && qs.suggestionIndex >= 0) {
        dom.input.value = qs.kanjiOnly + qs.currentSuggestions[qs.suggestionIndex];
        hideKanjiSuggestions(dom, qs);
        dom.input.focus();
        return;
      }
      handleSubmit(dom, qs, quizParams, decoded, navigate);
      return;
    }

    // Any other key → focus input
    if (document.activeElement !== dom.input && !dom.input.readOnly) {
      dom.input.focus();
    }
  });

  // Romaji → kana conversion + kanji suggestions
  dom.input.addEventListener("input", () => {
    if (!qs.questions.length) return;

    const q   = qs.questions[qs.index];
    const raw = dom.input.value.toLowerCase();
    dom.input.value = raw;

    if (q.kind !== "meaning") {
      const kana = romajiToKana(raw);
      dom.input.value = kana;

      if (q.kind === "reverse") {
        const validKana  = Object.values(maps.romajiToKana);
        const kanaOnly   = kana.split("").filter(c => validKana.includes(c)).join("");
        qs.kanjiOnly     = kana.split("").filter(c => !validKana.includes(c)).join("");
        showKanjiSuggestions(dom, qs, kanaToKanji(kanaOnly));
      }
    }
  });

  // Close suggestions on outside click
  document.addEventListener("click", e => {
    if (!dom.input.contains(e.target) && !dom.suggestionsEl.contains(e.target)) {
      hideKanjiSuggestions(dom, qs);
    }
  });
}