// ============================================================
//  quiz-logic.js  —  Quiz orchestration
//  Single export: renderQuizInContainer(container, quizParams, userData, navigate)
// ============================================================

import { VIEWS } from "./config.js";
import {
  fetchUserCards, fetchOwnLevels,
  setCardKnown, skipDailyWord,
  recordNewWordDone, recordReviewCorrect,
  recordReviewWrong, recordCardAttempt,
  markLevelSuccess, incrementStreakNew, incrementStreakReviews,
  initDailyReviewsIfNeeded, removeFromReviewsList,
  fetchCurrentUser,
} from "./db.js";
import { getDailyWords, getReviewsDue, getReviewsForToday } from "../utils/dailyWords.js";
import { buildQuestions, prioritizeQuestions } from "../quiz/quiz-builder.js";
import { loadJapaneseMaps, romajiToKana, kanaToKanji, maps, getHardKanjiReadings } from "../quiz/japanese.js";
import { normalize, isCloseEnough, regardlessKana, shuffle } from "../quiz/utils.js";
import { freshQuizState } from "./quiz-state.js";
import {
  injectQuizHTML, getQuizDOMRefs,
  initHeader, updateHeader,
  showQuestion, displayAnswerCard,
  resetAnswerArea, showResultScreen,
  resetUIForRetry, updateKindLabel,
  updateScoreBadge,
  showKanjiSuggestions, hideKanjiSuggestions,
  selectNextSuggestion, selectPrevSuggestion,
} from "./quiz-ui.js";
import { fetchJSON } from "../utils/fetch.js";
import { isDueToday } from "../utils/srs.js";
import { getTodayLocal } from "../utils/date.js";
import { getOccurrences } from "./occurrenceIndex.js";



// ── Decode quizParams ─────────────────────────────────────────

function decodeParams(quizParams) {
  const BUTTON_CONFIG = [
    ["radical", "Radical", "meaning"],
    ["kanji", "Kanji", "meaning"],
    ["kanji", "Kanji", "reading"],
    ["kanji", "Kanji", "reverse"],
    ["vocabulary", "Vocabulary", "meaning"],
    ["vocabulary", "Vocabulary", "reading"],
    ["vocabulary", "Vocabulary", "reverse"],
  ];

  if (quizParams.mode === "reviews") {
    return { type: "reviews", label: "SRS", levelText: "Reviews", exercise: null };
  }

  const rawKey = quizParams.levelKey ?? quizParams.ownKey ?? "1-1";
  const indexStr = rawKey.split("-").pop();
  const typeIndex = Math.max(0, parseInt(indexStr, 10) - 1);
  const cfg = BUTTON_CONFIG[typeIndex] ?? BUTTON_CONFIG[0];

  if (quizParams.mode === "level") {
    const [lvl] = rawKey.split("-");
    return {
      type: cfg[0],
      label: cfg[0],
      levelText: `Level ${lvl} — ${cfg[1]}`,
      exercise: cfg[2],
      levelKey: rawKey,
      levelNum: lvl,
    };
  }

  if (quizParams.mode === "jlpt") {
    const type = quizParams.progressType ?? "kanji";
    return {
      type,
      label: type,
      levelText: `JLPT ${quizParams.jlptLevel} — ${type}`,
      exercise: quizParams.exerciseType ?? "meaning",
      jlptLevel: quizParams.jlptLevel,
      progressType: type,
    };
  }

  // own mode
  const ownName = decodeURIComponent(rawKey.split("-").slice(0, -1).join("-"));
  return {
    type: cfg[0],
    label: cfg[0],
    levelText: `${ownName} — ${cfg[1]}`,
    exercise: cfg[2],
    ownName,
    ownKey: rawKey,
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

  dom.returnBtn.onclick = quit;
  container.querySelector("#quiz-logo").onclick = quit;

  updateHeader(dom, qs, quizParams.mode, quizParams.limit);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

// ── Data loading ──────────────────────────────────────────────

async function attachCardStats(questions, exercise) {
  const cardsData = await fetchUserCards();
  if (!cardsData) return;

  for (const q of questions) {
    const cardEntry = cardsData[q.id];
    const typeEntry = cardEntry?.[exercise];
    q.attempts = typeEntry?.attempts || 0;
    q.correct = typeEntry?.correct || 0;
    q.srs_level = typeEntry?.srs_level ?? 0;
    q.next_review = typeEntry?.next_review ?? null;
    q.occurrences = getOccurrences(q.id) || [];
    q.known = cardEntry?.known || false;
  }
}

async function attachNew(questions) {
  const userData = await fetchCurrentUser();
  const reviewsList = userData?.streak?.[getTodayLocal()]?.reviews_list ?? [];

  // Construit un Set des clés "_new" pour lookup O(1)
  const newKeys = new Set(
    reviewsList
      .filter(key => key.endsWith("_new"))
      .map(key => {
        const parts = key.split("_");
        parts.pop(); // retire "new"
        return parts.join("_"); // "id_exercise"
      })
  );

  for (const q of questions) {
    q.isNew = newKeys.has(`${q.id}_${q.kind}`);
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
    const ids = await fetchJSON(`id_per_level/${decoded.levelNum}_${decoded.type}.json`);
    qs.questions = await buildQuestions(ids, decoded.exercise);
    await attachCardStats(qs.questions, decoded.exercise);
    qs.questions = await applySettingsToQuestions(qs.questions, quizParams);
    return;
  }

  // ── JLPT ───────────────────────────────────────────────────
  if (quizParams.mode === "jlpt") {
    const type = quizParams.progressType ?? "kanji";
    const typeFile = (type === "vocabulary" || type === "vocab") ? "vocab" : "kanji";
    const ids = await fetchJSON(`id_per_jlpt/${quizParams.jlptLevel}_${typeFile}.json`);
    qs.questions = await buildQuestions(ids, decoded.exercise);
    await attachCardStats(qs.questions, decoded.exercise);
    qs.questions = await applySettingsToQuestions(qs.questions, quizParams);
    return;
  }

  // ── Own ────────────────────────────────────────────────────
  if (quizParams.mode === "own") {
    const ownName = decoded.ownName;
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

  // ── Daily ──────────────────────────────────────────────────
  if (quizParams.mode === "daily") {
    const allSubjects = window.ALL_SUBJECTS ?? {};
    const userData = await fetchCurrentUser();

    // Mots déjà faits aujourd'hui
    const today = getTodayLocal();
    const alreadyDone = userData?.streak?.[today]?.new_done ?? 0;
    qs.newWordsCorrect = alreadyDone;

    const words = getDailyWords(userData, allSubjects, 10);
    const ids = words.map(w => w.id);

    qs.questions = await buildQuestions(ids, "reading");
    await attachCardStats(qs.questions, "reading");

    const oldReviews = userData?.streak?.[today]?.reviews_number ?? 0;
    const newReviews = userData?.streak?.[today]?.new_reviews_number ?? 0;
    qs.totalReviews = oldReviews + newReviews;         // ← total des deux
    qs.reviewsCorrect = userData?.streak?.[today]?.reviews_done ?? 0;
    return;
  }

  // ── Reviews ────────────────────────────────────────────────
  if (quizParams.mode === "reviews") {
    const allSubjects = window.ALL_SUBJECTS ?? {};
    const userData = await fetchCurrentUser();
    const today = getTodayLocal();

    const due = getReviewsDue(userData, allSubjects);

    // ← était: buildQuestions(ids, "reading") hardcodé + pas d'attachCardStats
    qs.questions = await buildReviewQuestions(due, allSubjects);

    await attachCardStats(qs.questions, "reading");
    await attachNew(qs.questions);
    qs.totalReviews = (userData?.streak?.[today]?.old_reviews_number ?? 0)
      + (userData?.streak?.[today]?.new_reviews_number ?? 0);
    qs.reviewsCorrect = (userData?.streak?.[today]?.old_reviews_done ?? 0)
      + (userData?.streak?.[today]?.new_reviews_done ?? 0);

  }
}

async function buildReviewQuestions(reviews, allSubjects) {
  const cardsData = await fetchUserCards();
  const built = await Promise.all(
    reviews.map(async ({ id, exercise }) => {
      const result = await buildQuestions([id], exercise);

      if (!result?.length) return null;
      const cardEntry = cardsData?.[id];
      return {
        ...result[0],
        attempts: cardEntry?.[exercise]?.attempts || 0,
        correct: cardEntry?.[exercise]?.correct || 0,
        srs_level: cardEntry?.[exercise]?.srs_level ?? 0,
        next_review: cardEntry?.[exercise]?.next_review ?? null,
        occurrences: getOccurrences(id)
          || [],
        known: cardEntry?.known || false,
      };
    })
  );
  return built.filter(Boolean);
}

// ── Quiz flow ─────────────────────────────────────────────────

function showCurrentQuestion(dom, qs, quizParams, decoded, navigate) {
  const limit = quizParams.limit ?? 60;

  if (qs.index >= qs.questions.length && quizParams.mode !== "reviews") {
    console.log("b");
    handleQuizEnd(dom, qs, quizParams, decoded, navigate);
    return;
  }

  if (quizParams.mode === "reviews" && qs.questions.length === 0) {
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


function retryFailedCards(dom, qs, quizParams, decoded, navigate) {
  if (!qs.failedCards.length) return;

  qs.index = 0;
  qs.questions = qs.failedCards;
  qs.failedCards = [];
  qs.correct = 0;
  qs.redid = true;

  resetUIForRetry(dom);
  updateHeader(dom, qs, quizParams.mode, quizParams.limit);
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
    dom, qs, quizParams.mode,
    () => window.location.reload(),
    () => retryFailedCards(dom, qs, quizParams, decoded, navigate),
    () => navigate(VIEWS.MAIN)
  );
}


async function skipCurrentQuestion(dom, qs, quizParams, decoded, navigate) {
  const q = qs.questions[qs.index];
  if (!q) return;

  skipDailyWord(q.id);
  dom.container.querySelector("#quiz-known-btn")?.remove();
  resetAnswerArea(dom);
  qs.questions.splice(qs.index, 1);

  if (quizParams.mode === "daily") {
    const userData = await fetchCurrentUser();
    const allSubjects = window.ALL_SUBJECTS ?? {};
    const doneIds = new Set(qs.questions.map(q => q.id));
    const newWords = getDailyWords(userData, allSubjects, qs.questions.length + 10)
      .filter(w => !doneIds.has(w.id));
    if (newWords.length) {
      const built = await buildQuestions([newWords[0].id], "reading");
      if (built?.length) qs.questions.push(built[0]);
    }
  }

  qs.awaitingNext = false;
  updateHeader(dom, qs, quizParams.mode, quizParams.limit);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

// ── Event binding ─────────────────────────────────────────────
async function handleSubmit(dom, qs, quizParams, decoded, navigate) {
  const q = qs.questions[qs.index];
  if (!q) return;

  if (q.kind !== "meaning" && dom.input.value.endsWith("n")) {
    dom.input.value = dom.input.value.slice(0, -1) + "ん";
  }

  const mode = quizParams.mode;

  // ══ PREMIER APPUI ══════════════════════════════════════════
  if (!qs.awaitingNext) {
    qs.awaitingNext = true;
    const userAnswer = normalize(dom.input.value);
    const isCorrect = checkAnswer(q, userAnswer);
    qs.lastCorrect = isCorrect;
    qs.total++;

    // Feedback visuel
    dom.input.classList.add(isCorrect ? "correct" : "wrong");
    dom.input.readOnly = true;

    // Compteurs locaux
    if (isCorrect) qs.correct++;

    // Mise à jour Firebase en arrière-plan (fire-and-forget → pas de latence)
    if (mode === "reviews") {
      if (isCorrect) {
        recordReviewCorrect(q.id, q.kind, q.srs_level ?? 0, q.isNew);
        qs.reviewsCorrect++;
      } else {
        recordReviewWrong(q.id, q.kind);
      }
    } else {
      recordCardAttempt(q.id, q.kind, isCorrect);
    }

    // Boutons contextuels
    dom.container.querySelector("#quiz-known-btn")?.remove();

    if (mode === "daily") {
      // Bouton Skip
      const skipBtn = document.createElement("button");
      skipBtn.id = "quiz-known-btn";
      skipBtn.className = "btn own-study-btn known-btn--inactive";
      skipBtn.innerHTML = `<div class="level">⏭ Skip</div>`;
      skipBtn.onclick = async () => {
        skipBtn.disabled = true;
        skipBtn.className = "btn own-study-btn known-btn--active";
        skipBtn.innerHTML = `<div class="level">✅ Skipped</div>`;
        await skipCurrentQuestion(dom, qs, quizParams, decoded, navigate);
      };
      dom.answerBox.insertAdjacentElement("afterend", skipBtn);

    } else if (mode !== "reviews") {
      // Bouton Mark as known (quiz normal)
      const knownBtn = document.createElement("button");
      knownBtn.id = "quiz-known-btn";
      knownBtn.className = `btn own-study-btn ${q.known ? "known-btn--active" : "known-btn--inactive"}`;
      knownBtn.innerHTML = `<div class="level">${q.known ? "✅ Known" : "○ Mark as known"}</div>`;
      knownBtn.onclick = async () => {
        setCardKnown(q.id);
        q.known = true;
        knownBtn.className = "btn own-study-btn known-btn--active";
        knownBtn.innerHTML = `<div class="level">✅ Known</div>`;
      };
      dom.container.appendChild(knownBtn);
    }

    // Affichage réponse
    displayAnswerCard(dom, q, navigate);
    updateKindLabel(dom, q, isCorrect);
    updateScoreBadge(dom, qs);
    updateHeader(dom, qs, mode, quizParams.limit);
    return;
  }

  // ══ SECOND APPUI ═══════════════════════════════════════════
  dom.container.querySelector("#quiz-known-btn")?.remove();
  resetAnswerArea(dom);

  if (mode === "daily") {
    if (qs.lastCorrect) {
      // si on a bon, on skip la question et on ajoute un nouveau mot à faire aujourd'hui (pour compenser)
      await skipCurrentQuestion(dom, qs, quizParams, decoded, navigate);
    } else {
      // Repousser à la fin et ajouter à la base de donnée des mots daily 
      qs.newWordsCorrect++;
      recordNewWordDone(q.id, q.kind);
      qs.questions.splice(qs.index, 1);
      const userData = await fetchCurrentUser();
      const allSubjects = window.ALL_SUBJECTS ?? {};
      const doneIds = new Set(qs.questions.map(q => q.id));
      const newWords = getDailyWords(userData, allSubjects, qs.questions.length + 10)
        .filter(w => !doneIds.has(w.id));
      if (newWords.length) {
        const built = await buildQuestions([newWords[0].id], "reading");
        if (built?.length) qs.questions.push(built[0]);
      }

    }

  } else if (mode === "reviews") {
    if (qs.lastCorrect) {
      qs.questions.splice(qs.index, 1); // Firebase déjà mis à jour au 1er appui
    } else {
      const failed = qs.questions.splice(qs.index, 1)[0];
      qs.questions.push(failed);
    }

  } else {
    // Quiz normal
    if (!qs.lastCorrect) qs.failedCards.push(q);
    qs.index++;
  }

  updateHeader(dom, qs, mode, quizParams.limit);
  showCurrentQuestion(dom, qs, quizParams, decoded, navigate);
}

function bindEvents(dom, qs, quizParams, decoded, navigate) {
  const controller = new AbortController();
  const { signal } = controller;

  dom.submitBtn.addEventListener("click", () =>
    handleSubmit(dom, qs, quizParams, decoded, navigate)
  );

  dom.input.addEventListener("keydown", e => {
    if (dom.suggestionsEl.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); selectNextSuggestion(dom, qs); }
    if (e.key === "ArrowUp") { e.preventDefault(); selectPrevSuggestion(dom, qs); }
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

    const q = qs.questions[qs.index];
    const raw = dom.input.value.toLowerCase();
    dom.input.value = raw;

    if (q.kind !== "meaning") {
      const kana = romajiToKana(raw);
      dom.input.value = kana;

      if (q.kind === "reverse") {
        const validKana = Object.values(maps.romajiToKana);
        const kanaOnly = kana.split("").filter(c => validKana.includes(c)).join("");
        qs.kanjiOnly = kana.split("").filter(c => !validKana.includes(c)).join("");
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

  const ratio = q.correct / q.attempts;
  const urgency = (1 - ratio) * Math.log(q.attempts + 1);
  return 1 + ratio - urgency + Math.random() * 0.15;
}