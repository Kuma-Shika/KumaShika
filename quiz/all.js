// =========================================================
// VARIABLES GLOBALES
// =========================================================
let ROMAJI_MAP = {};
let KANA_TO_KANJI = {};
let ALL_TO_HIRAGANA = {};

fetch("../assets/romaji_to_kana.json")
  .then(r => r.json())
  .then(map => {
    ROMAJI_MAP = map;
    console.log("IME chargé", ROMAJI_MAP);
  });

fetch("../assets/reading_to_kanji.json")
  .then(r => r.json())
  .then(map => {
    KANA_TO_KANJI = map;
    console.log("Dictionnaire kana->kanji chargé", KANA_TO_KANJI);
  });

fetch("../assets/all_to_hiragana.json")
  .then(r => r.json())
  .then(map => {
    ALL_TO_HIRAGANA = map;
    console.log("Dictionnaire all->hiragana chargé", ALL_TO_HIRAGANA);
  });

// Tableau de toutes les questions du quiz
let questions = [];

// Index de la question actuelle (commence à 0)
let index = 0;

// Nombre de réponses correctes
let correct = 0;

// Indique si on attend que l'utilisateur passe à la question suivante
let awaitingNext = false;

// =========================================================
// RÉFÉRENCES AUX ÉLÉMENTS DOM
// =========================================================

// En-tête
const headerType = document.getElementById("header-type");
const headerLevel = document.getElementById("header-level");
const headerProgress = document.getElementById("header-progress");
const headerScore = document.getElementById("header-score");

// Carte de question
const card = document.getElementById("card");
const kind = document.getElementById("kind");
const questionEl = document.getElementById("question");
const feedback = document.getElementById("feedback");

// Champ de saisie
const input = document.getElementById("answer");

// Carte de réponse
const answerBox = document.getElementById("answer-box");
const answerMain = document.getElementById("answer-main");
const answerSub = document.getElementById("answer-sub");
const answerPos = document.getElementById("answer-pos");
const mnemonicBox = document.getElementById("explanation-box");
const answerExamples = document.getElementById("examples");

const suggestionsEl = document.getElementById("kanji-suggestions");
let suggestionIndex = -1;
let currentSuggestions = [];

// =========================================================
// RÉCUPÉRATION DES PARAMÈTRES URL
// =========================================================

const buttons = [
  ["radical", "Radical", "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "reading", "reading"],
  ["kanji", "Kanji", "en-jp", "EN → JP", "reading", "reverse"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading", "reverse"],
];

const params = new URLSearchParams(window.location.search);
const level_all = params.get("level");
const level = level_all ? level_all.split("-")[0] : "1";
const typeIndex = level_all ? parseInt(level_all.split("-")[1]) - 1 : 0;
const type = buttons[typeIndex][0];
const mode = buttons[typeIndex][2];
const exercise = buttons[typeIndex][4];
const exercise_display = buttons[typeIndex][5];

// =========================================================
// FIREBASE
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSqsd9LnK6CX8vMV2vzkx5FbB6tg6PrDM",
  authDomain: "kumashika-5f5aa.firebaseapp.com",
  projectId: "kumashika-5f5aa",
  storageBucket: "kumashika-5f5aa.firebasestorage.app",
  messagingSenderId: "390122758489",
  appId: "1:390122758489:web:4dc111ac19cb4ff3182c48",
  measurementId: "G-Y5GND1BNLK"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
window.db = db;

// =========================================================
// MODE MULTIJOUEUR
// =========================================================

let isMultiplayer = false;
let gameId = null;
let gameUnsubscribe = null;
let questionTimer = null;
let timeRemaining = 10;

// Vérifier si mode multijoueur
gameId = params.get("game");
if (gameId) {
  isMultiplayer = true;
  console.log("Mode multijoueur activé, game:", gameId);
}

// =========================================================
// FONCTIONS UTILITAIRES
// =========================================================

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function normalize(str) {
  return str.trim().toLowerCase();
}

function highlightWord(sentence, word) {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  return sentence.replace(regex, `<strong>${word}</strong>`);
}

function cleanText(text) {
  if (typeof text !== "string") return text;
  return text.replace(/<[^>]*>/g, "");
}

function isCloseEnough(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  let diff = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      diff++;
      if (diff > 1) return false;

      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else {
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }

  return true;
}

function regardelessKana(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  const a_hira = a.split("").map(c => ALL_TO_HIRAGANA[c] || c).join("");
  const b_hira = b.split("").map(c => ALL_TO_HIRAGANA[c] || c).join("");

  return a_hira === b_hira;
}



// =========================================================
// GESTION JAPONAIS
// =========================================================

function romajiToKana(input) {
  let result = "";
  let i = 0;

  while (i < input.length) {
    if (!"azertyuiopqsdfghjklmwxcvbn".includes(input[i])) {
      result += input[i];
      i++;
      continue;
    }
    
    if (i + 1 < input.length && input[i] === "n" && input[i + 1] === "n") {
      result += "ん";
      i += 2;
      continue;
    }
    
    if (i + 1 < input.length && input[i] === "n" && !("aeiouy".includes(input[i + 1]))) {
      result += "ん";
      i++;
      continue;
    }

    if (i + 1 < input.length && input[i] === input[i + 1] && !"aeiouyn".includes(input[i])) {
      result += "っ";
      i++;
      continue;
    }

    let skip = false;
    for (let len = 2; len >= 0; len--) {
      if (i + len < input.length && ROMAJI_MAP[input.slice(i, i + len + 1)]) {
        result += ROMAJI_MAP[input.slice(i, i + len + 1)];
        i += len+1;
        skip = true;
        continue;
      }
    }

    if (skip) continue;

    result += input[i];
    i++;
  }

  return result;
}

function kanaToKanji(input) {
  if (input in KANA_TO_KANJI) {
    return KANA_TO_KANJI[input];
  } else {
    return [];
  }
}

function showKanjiSuggestions(kanjis) {
  suggestionsEl.innerHTML = "";
  currentSuggestions = kanjis;

  if (!kanjis.length) {
    hideKanjiSuggestions();
    return;
  }

  suggestionIndex = 0;
  updateKanjiSelection();

  kanjis.forEach((k, i) => {
    const div = document.createElement("div");
    div.className = "kanji-option";
    div.textContent = k;

    if (i === 0) {
      div.classList.add("selected");
    }

    div.addEventListener("click", () => {
      input.value = k;
      hideKanjiSuggestions();
    });

    suggestionsEl.appendChild(div);
  });

  suggestionsEl.classList.remove("hidden");
}

function hideKanjiSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionIndex = -1;
  currentSuggestions = [];
}

function updateKanjiSelection() {
  const items = [...suggestionsEl.children];

  items.forEach((el, i) => {
    el.classList.toggle("selected", i === suggestionIndex);

    if (i === suggestionIndex) {
      el.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  });
}

// =========================================================
// FONCTIONS MULTIJOUEUR
// =========================================================

async function initMultiplayer() {
  if (!isMultiplayer) return;

  try {
    const gameRef = doc(db, "parties", gameId);
    
    // Attendre un peu pour que Firebase propage le statut
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      alert("Cette partie n'existe pas.");
      window.location.href = "multiplayer.html";
      return;
    }

    const gameData = gameSnap.data();
    
    if (gameData.status !== "playing") {
      alert("Cette partie n'a pas encore commencé. Status: " + gameData.status);
      window.location.href = "../multiplayer/multiplayer.html";
      return;
    }

    createScorePanel();

    gameUnsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        updateScorePanel(snapshot.data());
      }
    });

    console.log("Multijoueur initialisé");
  } catch (error) {
    console.error("Erreur initialisation multijoueur:", error);
    alert("Erreur lors du chargement de la partie.");
    window.location.href = "multiplayer.html";
  }
}

function createScorePanel() {
  const panel = document.createElement("div");
  panel.id = "multiplayer-panel";
  panel.innerHTML = `
    <div class="panel-header">
      <h3>🎮 Scores</h3>
      <div id="timer-display">10s</div>
    </div>
    <div id="players-scores"></div>
  `;
  document.body.appendChild(panel);
}

function updateScorePanel(gameData) {
  const playersScores = document.getElementById("players-scores");
  if (!playersScores) return;

  const currentUserId = localStorage.getItem("currentUser");
  const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score);

  playersScores.innerHTML = sortedPlayers.map((player, index) => {
    const isCurrentUser = player.id === currentUserId;
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
    
    return `
      <div class="player-score-card ${isCurrentUser ? 'current-user' : ''}">
        <div class="player-rank">${medal || (index + 1)}</div>
        <div class="player-score-info">
          <div class="player-score-name">${player.name}</div>
          <div class="player-score-points">${player.score} pts</div>
        </div>
      </div>
    `;
  }).join('');
}

function startQuestionTimer() {
  if (!isMultiplayer) return;

  timeRemaining = 10;
  updateTimerDisplay();

  questionTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      clearInterval(questionTimer);
      if (!awaitingNext) {
        handleSubmit();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timer-display");
  if (!timerDisplay) return;

  timerDisplay.textContent = `${timeRemaining}s`;
  
  if (timeRemaining <= 3) {
    timerDisplay.style.color = "#ef4444";
    timerDisplay.style.fontWeight = "700";
  } else {
    timerDisplay.style.color = "#ffffff";
    timerDisplay.style.fontWeight = "600";
  }
}

function stopQuestionTimer() {
  if (questionTimer) {
    clearInterval(questionTimer);
    questionTimer = null;
  }
}

async function updatePlayerScore(isCorrect) {
  if (!isMultiplayer || !isCorrect) return;

  try {
    const gameRef = doc(db, "parties", gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) return;

    const gameData = gameSnap.data();
    const currentUserId = localStorage.getItem("currentUser");
    
    const updatedPlayers = gameData.players.map(player => {
      if (player.id === currentUserId) {
        return { ...player, score: player.score + 1 };
      }
      return player;
    });

    await updateDoc(gameRef, {
      players: updatedPlayers
    });

  } catch (error) {
    console.error("Erreur mise à jour score:", error);
  }
}

// =========================================================
// GESTION DES ÉVÉNEMENTS
// =========================================================

function updateScoreBadge() {
  const answered = index + 1;
  const scorePercent = Math.round((correct / answered) * 100);
  const badge = document.getElementById("score-badge");
  
  badge.classList.remove('excellent', 'good', 'needs-work');
  
  if (scorePercent >= 80) {
    badge.classList.add('excellent');
  } else if (scorePercent >= 60) {
    badge.classList.add('good');
  } else {
    badge.classList.add('needs-work');
  }
}

const submitBtn = document.getElementById("submit-btn");

async function handleSubmit() {
  const q = questions[index];

  if (q.kind !== "meaning" && input.value.length > 0 && input.value[input.value.length - 1] === "n"){
    input.value = input.value.slice(0, -1) + "ん";
  }

  if (!awaitingNext) {
    const userAnswer = normalize(input.value);
    
    if (userAnswer === "" && !isMultiplayer) {
      return;
    }

    let isCorrect = false;
    if (q.kind === "meaning") {
      isCorrect = q.answers.some(answer =>
        isCloseEnough(normalize(answer), userAnswer)
      );
    } else {
      isCorrect = q.answers.some(answer =>
        regardelessKana(normalize(answer), userAnswer)
      );
    }

    displayAnswerCard(q);

    if (isCorrect) {
      input.classList.add("correct");
      correct++;
    } else {
      input.classList.add("wrong");
    }

    if (isMultiplayer) {
      stopQuestionTimer();
      await updatePlayerScore(isCorrect);
    }

    const answered = index + 1;
    const scorePercent = Math.round((correct / answered) * 100);
    headerScore.textContent = `${scorePercent}%`;
    updateScoreBadge();

    input.readOnly = true;
    awaitingNext = true;
    return;
  }

  index++;
  updateHeader();
  resetEverything();
  showQuestion();
}

submitBtn.addEventListener("click", handleSubmit);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["Tab", "Escape", "F5"].includes(e.key)) return;
  
  if (e.key === "Enter") {
    e.preventDefault();
    
    if (!suggestionsEl.classList.contains("hidden") && suggestionIndex >= 0) {
      input.value = kanji_only + currentSuggestions[suggestionIndex];
      hideKanjiSuggestions();
      input.focus();
      return;
    }
    
    handleSubmit();
    return;
  }
  
  if (document.activeElement !== input && !input.readOnly) {
    input.focus();
  }
});

let kanji_only = "";

input.addEventListener("keydown", (e) => {
  if (!suggestionsEl.classList.contains("hidden")) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      suggestionIndex = (suggestionIndex + 1) % currentSuggestions.length;
      updateKanjiSelection();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      suggestionIndex =
        (suggestionIndex - 1 + currentSuggestions.length) %
        currentSuggestions.length;
      updateKanjiSelection();
      return;
    }
  }
});

input.addEventListener("input", () => {
  if (!questions.length) return;

  const q = questions[index];
  const raw = input.value.toLowerCase();

  input.value = raw;

  if (q.kind === "reading") {
    const kana = romajiToKana(raw);
    input.value = kana;
    if (mode === "en-jp") {
      const validKana = Object.values(ROMAJI_MAP);

      const kana_only = kana
        .split("")
        .filter(char => validKana.includes(char))
        .join("");
      
      kanji_only = kana
        .split("")
        .filter(char => !validKana.includes(char))
        .join("");

      const kanjis = kanaToKanji(kana_only);
      showKanjiSuggestions(kanjis);
    }
  }
});

// =========================================================
// CONSTRUCTION DES QUESTIONS
// =========================================================

function buildQuestions(data, mode, exercise) {
  const qs = [];

  data.forEach(item => {
    let res = {
      prompt: "",
      answers: [],
      readings: item.readings || [],
      meanings: item.meanings || [],
      examples: item.examples || [],
      meaning_mnemonic: item.meaning_mnemonic || "",
      reading_mnemonic: item.reading_mnemonic || "",
      kind: exercise,
      display_kind: exercise_display,
      object: item.object,
      part_of_speech: item.part_of_speech || ""
    }

    if (item.object === "radical") {
      res.prompt = item.characters;
      res.answers = item.meanings;
    }

    if (item.object === "kanji" || item.object === "vocabulary") {
      if (mode === "jp-en") {
        if (exercise === "meaning") {
          res.prompt = item.characters;
          res.answers = item.meanings;
        }
        if (exercise === "reading") {
          res.prompt = item.characters;
          res.answers = item.readings;
        }
      }
      if (mode === "en-jp") {
        if (exercise === "reading") {
          res.prompt = item.meanings.join(", ");
          res.answers = [item.characters];
        }
      }
    }
    qs.push(res);
  });

  return qs;
}

// =========================================================
// AFFICHAGE DES QUESTIONS
// =========================================================

function showQuestion() {
  input.value = "";
  input.className = "";
  input.readOnly = false;
  input.focus();

  awaitingNext = false;

  if (index >= questions.length) {
    showResult();
    return;
  }

  const q = questions[index];

  questionEl.textContent = q.prompt;
  kind.textContent = q.display_kind;

  card.className = `${q.object}-${q.kind}`;

  if (isMultiplayer) {
    startQuestionTimer();
  }
}

function updateHeader() {
  headerProgress.textContent = `${index + 1} / ${questions.length}`;
}

function resetEverything() {
  mnemonicBox.classList.add("hidden");
  answerBox.classList.add("hidden");
  answerExamples.classList.add("hidden");
  answerExamples.innerHTML = "";
  answerPos.classList.add("hidden");
}

function displayAnswerCard(q) {
  if (q.object === "radical") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerBox.classList.remove("hidden");
    answerBox.classList.add("blue");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.meaning_mnemonic);
  }

  if (q.object === "kanji" && q.kind === "meaning" && mode === "jp-en") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.readings.join(", "));
    answerBox.classList.remove("hidden");
    answerBox.classList.add("light_pink");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.meaning_mnemonic);
  }

  if (q.object === "kanji" && q.kind === "reading" && mode === "jp-en") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.meanings.join(", "));
    answerBox.classList.remove("hidden");
    answerBox.classList.add("dark_pink");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.reading_mnemonic);
  }

  if (q.object === "vocabulary" && q.kind === "meaning" && mode === "jp-en") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.readings.join(", "));
    answerPos.textContent = cleanText(q.part_of_speech);
    answerBox.classList.remove("hidden");
    answerBox.classList.add("light_purple");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.meaning_mnemonic);
    answerExamples.classList.remove("hidden");
  }

  if (q.object === "vocabulary" && q.kind === "reading" && mode === "jp-en") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.meanings.join(", "));
    answerPos.textContent = cleanText(q.part_of_speech);
    answerBox.classList.remove("hidden");
    answerBox.classList.add("dark_purple");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.reading_mnemonic);
    answerExamples.classList.remove("hidden");
  }

  if (q.object === "kanji" && q.kind === "reading" && mode === "en-jp") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.readings.join(", "));
    answerBox.classList.remove("hidden");
    answerBox.classList.add("dark_purple");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.reading_mnemonic);
    answerExamples.classList.remove("hidden");
  }

  if (q.object === "vocabulary" && q.kind === "reading" && mode === "en-jp") {
    answerMain.textContent = cleanText(q.answers.join(", "));
    answerSub.textContent = cleanText(q.readings.join(", "));
    answerPos.textContent = cleanText(q.part_of_speech);
    answerBox.classList.remove("hidden");
    answerBox.classList.add("dark_purple");
    mnemonicBox.classList.remove("hidden");
    mnemonicBox.textContent = cleanText(q.reading_mnemonic);
    answerExamples.classList.remove("hidden");
  }

  if (q.examples && q.examples.length > 0) {
    q.examples.forEach(ex => {
      const exampleDiv = document.createElement("div");
      exampleDiv.className = "example-item";

      const jaDiv = document.createElement("div");
      jaDiv.className = "example-ja";
      jaDiv.innerHTML = highlightWord(ex.ja, q.prompt);

      const enDiv = document.createElement("div");
      enDiv.className = "example-en";
      enDiv.textContent = ex.en;

      exampleDiv.appendChild(jaDiv);
      exampleDiv.appendChild(enDiv);
      answerExamples.appendChild(exampleDiv);
    });
  }
}

async function markLevelSuccess(level) {
  const ref = doc(db, "users", localStorage.getItem("currentUser"));
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const now = new Date().toISOString();

  await updateDoc(ref, {
    [`levels.${level}`]: arrayUnion(now)
  });
}

function showResult() {
  const percent = Math.round((correct / questions.length) * 100);

  questionEl.innerHTML = `Quiz Completed!<br> ${correct} / ${questions.length}`;
  kind.textContent = "";

  input.classList.add("hidden");
  submitBtn.textContent = "Return to levels";
  submitBtn.classList.add("centered");
  submitBtn.onclick = () => {
    window.location.href = "../index.html";
  }

  headerProgress.textContent = "Terminé";
  headerScore.textContent = `${percent}%`;
  updateScoreBadge();
  
  console.log(correct, questions.length);
  if (correct === questions.length) {
    console.log("Niveau réussi !");
    markLevelSuccess(`${level_all}`);
  }

  if (isMultiplayer && gameUnsubscribe) {
    gameUnsubscribe();
  }
}

// =========================================================
// INITIALISATION
// =========================================================

function initHeader() {
  headerType.textContent = type.toUpperCase();
  headerLevel.textContent = `Level ${level}`;
  
  const headerRight = document.getElementById("header-right");
  headerRight.setAttribute('data-type', type.toUpperCase());
  headerRight.setAttribute('data-level', `Level ${level}`);
}

function loadQuizData() {
  fetch(`../data/${level}_${type}.json`)
    .then(response => response.json())
    .then(data => {
      questions = buildQuestions(data, mode, exercise);
      shuffle(questions);
      
      updateHeader();
      showQuestion();
      
      if (isMultiplayer) {
        initMultiplayer();
      }
    })
}

initHeader();
loadQuizData();