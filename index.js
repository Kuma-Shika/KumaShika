// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Configuration Firebase
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
const db = getFirestore(app);

const maxLevel = 60;
const grid = document.getElementById("grid");

const buttons = [
  ["radical", "Radical", "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "reading", "reading"],
  ["kanji", "Kanji", "en-jp", "EN → JP", "reading", "reverse"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading", "reverse"],
];

const types = {
  radical: {
    label: "Radical",
    exercises: [
      { index: 1, label: "JP → EN", sublabel: "MEANING" }
    ]
  },
  kanji: {
    label: "Kanji",
    exercises: [
      { index: 2, label: "JP → EN", sublabel: "MEANING" },
      { index: 3, label: "JP → EN", sublabel: "READING" },
      { index: 4, label: "EN → JP", sublabel: "REVERSE" }
    ]
  },
  vocabulary: {
    label: "Vocabulary",
    exercises: [
      { index: 5, label: "JP → EN", sublabel: "MEANING" },
      { index: 6, label: "JP → EN", sublabel: "READING" },
      { index: 7, label: "EN → JP", sublabel: "REVERSE" }
    ]
  }
};

// État
let currentView = "mainSelect"; // "mainSelect", "typeSelect", "levelSelect", "exerciseSelect", "gridView", "ownSelect"
let selectedType = null;
let selectedLevel = null;
let userData = null;

// Fonctions utilitaires
function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

function setCurrentUser(name) {
  localStorage.setItem("currentUser", name);
}

function logout() {
  localStorage.removeItem("currentUser");
  updateProfileUI();
}

async function userExists(username) {
  const ref = doc(db, "users", username);
  const snap = await getDoc(ref);
  return snap.exists();
}

async function createUser(username) {
  const ref = doc(db, "users", username);
  await setDoc(ref, {
    id: username,
    createdAt: serverTimestamp()
  });
}

async function getUserData(username) {
  const ref = doc(db, "users", username);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Initialiser les données utilisateur
const user = getCurrentUser();
if (user) {
  userData = await getUserData(user);
}

// Fonction de création de bouton retour
function createBackButton(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn btn-back";
  btn.innerHTML = `<div class="level">${text}</div>`;
  btn.onclick = onClick;
  return btn;
}

// =========================
// VUE : SÉLECTION PRINCIPALE (WaniKani, Reviews, Own)
// =========================

function renderMainSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  // --- WaniKani ---
  const wkBtn = document.createElement("button");
  wkBtn.className = "btn btn-large wanikani";
  wkBtn.innerHTML = `
    <div class="type">WaniKani</div>
    <div class="progress">Radical · Kanji · Vocabulary</div>
  `;
  wkBtn.onclick = () => {
    currentView = "typeSelect";
    render();
  };
  grid.appendChild(wkBtn);

  // --- Reviews ---
  const revBtn = document.createElement("button");
  revBtn.className = "btn btn-large review";
  revBtn.innerHTML = `
    <div class="type">Reviews</div>
  `;
  revBtn.onclick = () => {
    window.location.href = `quiz/quiz.html?reviews=true`;
  };
  grid.appendChild(revBtn);

  // --- Own ---
  const ownBtn = document.createElement("button");
  ownBtn.className = "btn btn-large own";
  ownBtn.innerHTML = `
    <div class="type">Own</div>
    <div class="progress">My texts</div>
  `;
  ownBtn.onclick = () => {
    currentView = "ownSelect";
    render();
  };
  grid.appendChild(ownBtn);
}

// =========================
// VUE : SÉLECTION DE TYPE (Radical, Kanji, Vocabulary)
// =========================

function renderTypeSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  // Bouton retour vers mainSelect
  const backBtn = createBackButton("← Home", () => {
    currentView = "mainSelect";
    render();
  });
  grid.appendChild(backBtn);

  Object.keys(types).forEach(typeKey => {
    const type = types[typeKey];
    const btn = document.createElement("button");
    btn.className = `btn btn-large ${typeKey}`;
    
    let completedLevels = 0;
    for (let level = 1; level <= maxLevel; level++) {
      const allExercisesDone = type.exercises.every(ex => {
        return userData?.levels?.[`${level}-${ex.index}`] &&
               userData.levels[`${level}-${ex.index}`].length > 0;
      });
      if (allExercisesDone) completedLevels++;
    }
    
    btn.innerHTML = `
      <div class="type">${type.label}</div>
      <div class="progress">${completedLevels} / ${maxLevel}</div>
    `;
    
    btn.onclick = () => {
      selectedType = typeKey;
      currentView = "levelSelect";
      render();
    };
    
    grid.appendChild(btn);
  });
}

// =========================
// VUE : SÉLECTION DE NIVEAU (1-60)
// =========================

function renderLevelSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";
  
  const type = types[selectedType];
  
  const backBtn = createBackButton("← Types", () => {
    currentView = "typeSelect";
    selectedType = null;
    render();
  });
  grid.appendChild(backBtn);
  
  const title = document.createElement("div");
  title.className = "grid-title";
  title.innerHTML = `<h2>${type.label}</h2>`;
  grid.appendChild(title);
  
  for (let level = 1; level <= maxLevel; level++) {
    const btn = document.createElement("button");
    btn.className = `btn ${selectedType}`;
    
    const allExercisesDone = type.exercises.every(ex => {
      return userData?.levels?.[`${level}-${ex.index}`] &&
             userData.levels[`${level}-${ex.index}`].length > 0;
    });
    
    if (allExercisesDone) {
      btn.classList.add("done");
    }
    
    btn.innerHTML = `
      <div class="type">${type.label}</div>
      <div class="level">Level ${level}</div>
    `;
    
    btn.onclick = async () => {
      if (type.exercises.length === 1) {
        if (params.has("game")) {
          const gameRef = doc(db, "parties", params.get("game"));    
          await updateDoc(gameRef, {
            level: `${level}-${type.exercises[0].index}`
          });  
          window.location.href = `multiplayer/multiplayer.html?&game=${params.get("game")}`;
        } else {
          window.location.href = `quiz/quiz.html?level=${level}-${type.exercises[0].index}`;
        }
      } else {
        selectedLevel = level;
        currentView = "exerciseSelect";
        render();
      }
    };
    
    grid.appendChild(btn);
  }
}

// =========================
// VUE : SÉLECTION D'EXERCICE
// =========================

function renderExerciseSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";
  
  const type = types[selectedType];
  
  const backBtn = createBackButton("← Levels", () => {
    currentView = "levelSelect";
    selectedLevel = null;
    render();
  });
  grid.appendChild(backBtn);
  
  const title = document.createElement("div");
  title.className = "grid-title";
  title.innerHTML = `<h2>Level ${selectedLevel} - ${type.label}</h2>`;
  grid.appendChild(title);
  
  type.exercises.forEach(exercise => {
    const btn = document.createElement("button");
    btn.className = `btn ${selectedType}`;
    
    const hasSuccess =
      userData?.levels?.[`${selectedLevel}-${exercise.index}`] &&
      userData.levels[`${selectedLevel}-${exercise.index}`].length > 0;
    if (hasSuccess) {
      btn.classList.add("done");
    }
    
    btn.innerHTML = `
      <div class="type">${exercise.label}</div>
      <div class="level">${exercise.sublabel}</div>
    `;
    
    btn.onclick = async () => {
      if (params.has("game")) {
        const gameRef = doc(db, "parties", params.get("game"));    
        await updateDoc(gameRef, {
          level: `${selectedLevel}-${exercise.index}`
        });
        window.location.href = `multiplayer/multiplayer.html?&game=${params.get("game")}`;
      } else {
        window.location.href = `quiz/quiz.html?level=${selectedLevel}-${exercise.index}`;
      }
    };
    
    grid.appendChild(btn);
  });
}

// =========================
// VUE : GRILLE DESKTOP (60×7)
// =========================

async function renderGridView() {
  grid.innerHTML = "";
  grid.className = "grid grid-desktop";
  
  for (let level = 1; level <= maxLevel; level++) {
    for (let type = 1; type <= 7; type++) {
      const btn = document.createElement("button");
      btn.className = `btn ${buttons[type - 1][0]}`;
      btn.innerHTML = `
        <div class="type">${buttons[type - 1][1]}</div>
        <div class="level">Level ${level}</div>
        <div class="type">${buttons[type - 1][5]}</div>
      `;
      
      const hasSuccess =
        userData?.levels?.[`${level}-${type}`] &&
        userData.levels[`${level}-${type}`].length > 0;
      if (hasSuccess) {
        btn.classList.add("done");
      }

      btn.onclick = async () => {
        if (params.has("game")) {   
          const gameRef = doc(db, "parties", params.get("game"));    
          await updateDoc(gameRef, {
            level: `${level}-${type}`
          });   
          window.location.href = `multiplayer/multiplayer.html?game=${params.get("game")}`;
        } else {
          window.location.href = `quiz/quiz.html?level=${level}-${type}`;
        }
      };
      
      grid.appendChild(btn);
    }
  }
}

// =========================
// VUE : OWN TEXTS
// =========================

function renderOwnSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const backBtn = createBackButton("← Home", () => {
    currentView = "mainSelect";
    render();
  });
  grid.appendChild(backBtn);

  const header = document.createElement("div");
  header.className = "own-header";
  header.innerHTML = `
    <div class="grid-title" style="grid-column: unset; flex:1;">
      <h2>My Texts</h2>
    </div>
    <button class="btn-add-own" id="addOwnBtn">＋</button>
  `;
  grid.appendChild(header);

  document.getElementById("addOwnBtn")?.addEventListener("click", openOwnModal);

  const ownLevels = userData?.ownLevels || {};
  const keys = Object.keys(ownLevels);

  if (!getCurrentUser()) {
    const msg = document.createElement("p");
    msg.className = "own-empty";
    msg.textContent = "Please log in to see your texts.";
    grid.appendChild(msg);
    return;
  }

  if (keys.length === 0) {
    const msg = document.createElement("p");
    msg.className = "own-empty";
    msg.textContent = "No texts yet. Press ＋ to add one!";
    grid.appendChild(msg);
    return;
  }

  keys.forEach(title => {
    const data = ownLevels[title];
    const vocabCount = data?.vocab?.length ?? 0;
    const kanjiCount = data?.kanji?.length ?? 0;

    const btn = document.createElement("button");
    btn.className = "btn own-card";
    btn.innerHTML = `
      <div class="own-card-title">${title}</div>
      <div class="own-card-meta">
        <span class="own-pill vocab-pill">📖 ${vocabCount} vocab</span>
        <span class="own-pill kanji-pill">🈳 ${kanjiCount} kanji</span>
      </div>
    `;
    btn.onclick = () => {
      window.location.href = `quiz/quiz.html?own=${encodeURIComponent(title)}`;
    };
    grid.appendChild(btn);
  });
}

// =========================
// MODAL OWN TEXT
// =========================

function openOwnModal() {
  const modal = document.getElementById("ownModal");
  document.getElementById("ownTitleInput").value = "";
  document.getElementById("ownContentInput").value = "";
  document.getElementById("ownMessage").textContent = "";
  modal.classList.remove("hidden");
  modal.classList.add("show");
  document.getElementById("ownTitleInput").focus();
}

function closeOwnModal() {
  const modal = document.getElementById("ownModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");
}

document.getElementById("ownCancelBtn").addEventListener("click", closeOwnModal);

document.getElementById("ownModal").addEventListener("click", e => {
  if (e.target === document.getElementById("ownModal")) closeOwnModal();
});

document.getElementById("ownSaveBtn").addEventListener("click", async () => {
  const title = document.getElementById("ownTitleInput").value.trim();
  const content = document.getElementById("ownContentInput").value.trim();
  const msg = document.getElementById("ownMessage");

  if (!title) { msg.textContent = "Please enter a title."; return; }
  if (!content) { msg.textContent = "Please enter some text."; return; }
  if (!getCurrentUser()) { msg.textContent = "You must be logged in."; return; }

  msg.textContent = "Analyzing…";

  await loadDictionary();
  await createOwnText(title, content);

  // Refresh userData
  userData = await getUserData(getCurrentUser());

  closeOwnModal();
  render();
});

// =========================
// RENDU PRINCIPAL
// =========================

function render() {
  switch (currentView) {
    case "mainSelect":
      renderMainSelect();
      break;
    case "typeSelect":
      renderTypeSelect();
      break;
    case "levelSelect":
      renderLevelSelect();
      break;
    case "exerciseSelect":
      renderExerciseSelect();
      break;
    case "gridView":
      renderGridView();
      break;
    case "ownSelect":
      renderOwnSelect();
      break;
  }
}

// Initialiser
render();

// =========================
// BOUTONS HEADER
// =========================

const multiplayerBtn = document.getElementById("multiplayerBtn");
multiplayerBtn.addEventListener("click", () => {
  window.location.href = "multiplayer/multiplayer.html";
});

const gridViewBtn = document.getElementById("gridViewBtn");
gridViewBtn.addEventListener("click", () => {
  if (currentView === "gridView") {
    currentView = "mainSelect";
    selectedType = null;
    selectedLevel = null;
  } else {
    currentView = "gridView";
  }
  render();
});

// =========================
// AUTH SYSTEM
// =========================

const profileCircle = document.getElementById("profileCircle");
const authModal = document.getElementById("authModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const params = new URLSearchParams(window.location.search);

function updateProfileUI() {
  const user = getCurrentUser();
  if (user) {
    profileCircle.textContent = user.slice(0, 2).toUpperCase();
  } else {
    profileCircle.textContent = "👤";
  }
}

profileCircle.addEventListener("click", () => {
  const user = getCurrentUser();
  authModal.classList.remove("hidden");
  authModal.classList.add("show");

  if (user) {
    usernameInput.classList.add("hidden");
    loginBtn.classList.add("hidden");
    createBtn.classList.add("hidden");
    authMessage.textContent = `Connected as ${user}`;
    logoutBtn.classList.remove("hidden");
  } else {
    usernameInput.classList.remove("hidden");
    loginBtn.classList.remove("hidden");
    createBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    authMessage.textContent = "";
    usernameInput.focus();
  }
});

loginBtn.onclick = async () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  const exists = await userExists(name);
  if (!exists) {
    authMessage.textContent = "Ce pseudo n'existe pas";
    return;
  }

  setCurrentUser(name);
  authModal.classList.remove("show");
  authModal.classList.add("hidden");
  updateProfileUI();
  userData = await getUserData(name);
  render();
};

createBtn.onclick = async () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  const exists = await userExists(name);
  if (exists) {
    authMessage.textContent = "Ce pseudo existe déjà";
    return;
  }

  await createUser(name);
  setCurrentUser(name);
  authModal.classList.remove("show");
  authModal.classList.add("hidden");
  updateProfileUI();
  userData = await getUserData(name);
  render();
};

logoutBtn.onclick = () => {
  logout();
  authModal.classList.remove("show");
  authModal.classList.add("hidden");
};

usernameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") loginBtn.click();
});

authModal.addEventListener("click", e => {
  if (e.target === authModal) {
    authModal.classList.remove("show");
    authModal.classList.add("hidden");
    authMessage.textContent = "";
  }
});

// =========================
// STREAK
// =========================

function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function updateStreakDisplay() {
  try {
    const username = localStorage.getItem("currentUser");
    if (!username) return;

    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const streakData = userData.streak || {};

    function formatDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    let streakDays = 0;
    let date = new Date();
    let yesterday = new Date();
    yesterday.setDate(date.getDate() - 1);

    while (true) {
      const dateStr = formatDate(yesterday);
      const dayData = streakData[dateStr];
      if (dayData && dayData.new >= 1 && dayData.reviews >= 1) {
        streakDays++;
        yesterday.setDate(yesterday.getDate() - 1);
      } else {
        break;
      }
    }

    const todayStr = formatDate(new Date());
    const todayData = streakData[todayStr] || { new: 0, reviews: 0 };
    if (todayData.new > 0 && todayData.reviews > 0) streakDays++;

    document.getElementById("streakDays").textContent = streakDays;

    const goalNew = document.getElementById("goalNew");
    goalNew.querySelector(".goal-status").textContent = `${todayData.new} / 1`;
    if (todayData.new >= 1) {
      goalNew.classList.add("completed");
      goalNew.querySelector(".goal-check").classList.remove("hidden");
    } else {
      goalNew.classList.remove("completed");
      goalNew.querySelector(".goal-check").classList.add("hidden");
    }

    const goalReview = document.getElementById("goalReview");
    goalReview.querySelector(".goal-status").textContent = `${todayData.reviews} / 1`;
    if (todayData.reviews >= 1) {
      goalReview.classList.add("completed");
      goalReview.querySelector(".goal-check").classList.remove("hidden");
    } else {
      goalReview.classList.remove("completed");
      goalReview.querySelector(".goal-check").classList.add("hidden");
    }

  } catch (error) {
    console.error("Erreur updateStreakDisplay:", error);
  }
}

// =========================
// DICTIONNAIRE & ANALYSE
// =========================

let KANJI_TO_WANIKANI = {};
let KANJI_TO_ID = {};
let VOCAB_TO_ID = {};

async function loadDictionary() {
  if (Object.keys(KANJI_TO_WANIKANI).length > 0) return; // déjà chargé
  const response = await fetch("../assets/kanji_to_wanikani.json");
  KANJI_TO_WANIKANI = await response.json();
  const response2 = await fetch("../assets/kanji_to_id.json");
  KANJI_TO_ID = await response2.json();
  const response3 = await fetch("../assets/vocab_to_id.json");
  VOCAB_TO_ID = await response3.json();
}

const MIN_NORMALIZE_LENGTH = 2;

function analyzeLyrics(text) {
  let i = 0;
  const results_voc = [];
  const results_kanji = [];

  while (i < text.length) {
    let longestMatch = null;
    let longestLength = 0;
    let normalizedMatch = null;

    for (let j = i + 1; j <= text.length; j++) {
      const sub = text.slice(i, j);

      if (KANJI_TO_WANIKANI[sub]) {
        longestMatch = sub;
        longestLength = j - i;
        normalizedMatch = sub;
        continue;
      }

      if (sub.length >= MIN_NORMALIZE_LENGTH) {
        const normalized = normalizeToDict(sub);
        if (normalized && KANJI_TO_WANIKANI[normalized]) {
          longestMatch = sub;
          longestLength = j - i;
          normalizedMatch = normalized;
        }
      }
    }

    if (longestMatch) {
      if ((!results_voc.includes(normalizedMatch)) && (KANJI_TO_WANIKANI[normalizedMatch].includes(normalizedMatch)) && (VOCAB_TO_ID[normalizedMatch])) {
        results_voc.push(normalizedMatch);
      }
      i += longestLength;
    } else {
      i++;
    }
  }

  for (const char of text) {
    if (KANJI_TO_ID[char] && (!results_kanji.includes(char))) {
      results_kanji.push(char);
    }
  }

  for (let i = 0; i < results_voc.length; i++) {
    results_voc[i] = VOCAB_TO_ID[results_voc[i]][0];
  }

  for (let i = 0; i < results_kanji.length; i++) {
    results_kanji[i] = KANJI_TO_ID[results_kanji[i]][0];
  }

  return { vocab: results_voc, kanji: results_kanji };
}

// Sauvegarde d'un texte Own — title = clé, content = texte à analyser
async function createOwnText(title, content) {
  const analysis = analyzeLyrics(content);
  const username = localStorage.getItem("currentUser");
  const userRef = doc(db, "users", username);

  await updateDoc(userRef, {
    [`ownLevels.${title}`]: analysis
  });
}

function normalizeToDict(word) {
  const candidates = [];
  const hasKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(word);

  // ── I-ADJECTIFS ──────────────────────────────────────────────
  if (word.endsWith("く"))           candidates.push(word.slice(0, -1) + "い");
  if (word.endsWith("くて"))         candidates.push(word.slice(0, -2) + "い");
  if (word.endsWith("くない"))       candidates.push(word.slice(0, -3) + "い");
  if (word.endsWith("くなかった"))   candidates.push(word.slice(0, -5) + "い");
  if (word.endsWith("かった"))       candidates.push(word.slice(0, -3) + "い");
  if (word.endsWith("かったです"))   candidates.push(word.slice(0, -5) + "い");
  if (word.endsWith("くなる"))       candidates.push(word.slice(0, -3) + "い");
  if (word.endsWith("くなった"))     candidates.push(word.slice(0, -4) + "い");
  if (word.endsWith("ければ"))       candidates.push(word.slice(0, -3) + "い");
  if (word.endsWith("くも"))         candidates.push(word.slice(0, -2) + "い");
  if (word.endsWith("さ"))           candidates.push(word.slice(0, -1) + "い");
  if (word.endsWith("そう"))         candidates.push(word.slice(0, -2) + "い");
  if (word.endsWith("すぎる"))       candidates.push(word.slice(0, -3) + "い");
  if (word.endsWith("です"))         candidates.push(word.slice(0, -2) + "い");

  // ── NA-ADJECTIFS ─────────────────────────────────────────────
  if (word.endsWith("な") && word.length > 1)       candidates.push(word.slice(0, -1));
  if (word.endsWith("に") && word.length > 1)       candidates.push(word.slice(0, -1));
  if (word.endsWith("で") && word.length > 1)       candidates.push(word.slice(0, -1));
  if (word.endsWith("じゃない"))     candidates.push(word.slice(0, -4));
  if (word.endsWith("ではない"))     candidates.push(word.slice(0, -4));
  if (word.endsWith("じゃなかった")) candidates.push(word.slice(0, -6));
  if (word.endsWith("ではなかった")) candidates.push(word.slice(0, -6));
  if (word.endsWith("だった"))       candidates.push(word.slice(0, -3));
  if (word.endsWith("でした"))       candidates.push(word.slice(0, -3));
  if (word.endsWith("そう") && word.length > 2)     candidates.push(word.slice(0, -2));
  if (word.endsWith("すぎる") && word.length > 3)   candidates.push(word.slice(0, -3));

  if (hasKanji || word.length >= 3) {

    // ── IRRÉGULIERS ────────────────────────────────────────────
    const irregularMap = {
      "する": "する",
      "して": "する", "した": "する", "しない": "する",
      "しなかった": "する", "します": "する", "しました": "する",
      "しません": "する", "しませんでした": "する",
      "しろ": "する", "するな": "する", "しなければ": "する",
      "すれば": "する", "しても": "する", "したら": "する",
      "できる": "する", "できた": "する", "できない": "する",
      "させる": "する", "させた": "する", "させない": "する",
      "される": "する", "された": "する", "されない": "する",
      "くる": "くる", "きて": "くる", "きた": "くる",
      "こない": "くる", "こなかった": "くる",
      "きます": "くる", "きました": "くる",
      "きません": "くる", "こい": "くる",
      "くれば": "くる", "きても": "くる", "きたら": "くる",
      "こさせる": "くる", "こられる": "くる",
      "来る": "来る", "来て": "来る", "来た": "来る",
      "来ない": "来る", "来ます": "来る", "来い": "来る",
    };
    if (irregularMap[word]) candidates.push(irregularMap[word]);

    // ── ICHIDAN ──────────────────────────────────────────────
    if (word.endsWith("て"))          candidates.push(word.slice(0, -1) + "る");
    if (word.endsWith("た"))          candidates.push(word.slice(0, -1) + "る");
    if (word.endsWith("ない"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("なかった"))    candidates.push(word.slice(0, -4) + "る");
    if (word.endsWith("ます"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("ました"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("ません"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("ませんでした")) candidates.push(word.slice(0, -6) + "る");
    if (word.endsWith("られる"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("られた"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("られない"))    candidates.push(word.slice(0, -4) + "る");
    if (word.endsWith("させる"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("させた"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("させない"))    candidates.push(word.slice(0, -4) + "る");
    if (word.endsWith("させられる"))  candidates.push(word.slice(0, -5) + "る");
    if (word.endsWith("れば"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("たら"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("ても"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("ろ"))          candidates.push(word.slice(0, -1) + "る");
    if (word.endsWith("よ"))          candidates.push(word.slice(0, -1) + "る");
    if (word.endsWith("よう"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("ながら"))      candidates.push(word.slice(0, -3) + "る");
    if (word.endsWith("そう"))        candidates.push(word.slice(0, -2) + "る");
    if (word.endsWith("すぎる"))      candidates.push(word.slice(0, -3) + "る");

    // ── GODAN ─────────────────────────────────────────────────
    const godanMap = [
      ["って",   "う"],  ["った",   "う"],
      ["いて",   "く"],  ["いた",   "く"],
      ["いで",   "ぐ"],  ["いだ",   "ぐ"],
      ["して",   "す"],  ["した",   "す"],
      ["んで",   "ぬ"],  ["んだ",   "ぬ"],
      ["んで",   "む"],  ["んだ",   "む"],
      ["んで",   "ぶ"],  ["んだ",   "ぶ"],
      ["って",   "つ"],  ["った",   "つ"],
      ["って",   "る"],  ["った",   "る"],
      ["わない", "う"],  ["かない", "く"],  ["がない", "ぐ"],
      ["さない", "す"],  ["なない", "ぬ"],  ["まない", "む"],
      ["ばない", "ぶ"],  ["たない", "つ"],  ["らない", "る"],
      ["わなかった", "う"],  ["かなかった", "く"],  ["がなかった", "ぐ"],
      ["さなかった", "す"],  ["まなかった", "む"],  ["ばなかった", "ぶ"],
      ["たなかった", "つ"],  ["らなかった", "る"],
      ["い",     "う"],  ["き",     "く"],  ["ぎ",     "ぐ"],
      ["し",     "す"],  ["に",     "ぬ"],  ["み",     "む"],
      ["び",     "ぶ"],  ["ち",     "つ"],  ["り",     "る"],
      ["います",     "う"],  ["きます",     "く"],  ["ぎます",     "ぐ"],
      ["します",     "す"],  ["にます",     "ぬ"],  ["みます",     "む"],
      ["びます",     "ぶ"],  ["ちます",     "つ"],  ["ります",     "る"],
      ["いました",   "う"],  ["きました",   "く"],
      ["いません",   "う"],  ["きません",   "く"],
      ["える",   "う"],  ["ける",   "く"],  ["げる",   "ぐ"],
      ["せる",   "す"],  ["ねる",   "ぬ"],  ["める",   "む"],
      ["べる",   "ぶ"],  ["てる",   "つ"],  ["れる",   "る"],
      ["われる", "う"],  ["かれる", "く"],  ["がれる", "ぐ"],
      ["される", "す"],  ["なれる", "ぬ"],  ["まれる", "む"],
      ["ばれる", "ぶ"],  ["たれる", "つ"],  ["られる", "る"],
      ["わせる", "う"],  ["かせる", "く"],  ["がせる", "ぐ"],
      ["させる", "す"],  ["なせる", "ぬ"],  ["ませる", "む"],
      ["ばせる", "ぶ"],  ["たせる", "つ"],  ["らせる", "る"],
      ["えば",   "う"],  ["けば",   "く"],  ["げば",   "ぐ"],
      ["せば",   "す"],  ["ねば",   "ぬ"],  ["めば",   "む"],
      ["べば",   "ぶ"],  ["てば",   "つ"],  ["れば",   "る"],
      ["おう",   "う"],  ["こう",   "く"],  ["ごう",   "ぐ"],
      ["そう",   "す"],  ["のう",   "ぬ"],  ["もう",   "む"],
      ["ぼう",   "ぶ"],  ["とう",   "つ"],  ["ろう",   "る"],
      ["え",     "う"],  ["け",     "く"],  ["げ",     "ぐ"],
      ["せ",     "す"],  ["ね",     "ぬ"],  ["め",     "む"],
      ["べ",     "ぶ"],  ["て",     "つ"],  ["れ",     "る"],
      ["ったら", "う"],  ["いたら", "く"],  ["いだら", "ぐ"],
      ["したら", "す"],  ["んだら", "む"],  ["んだら", "ぶ"],
      ["ったら", "つ"],  ["ったら", "る"],
      ["っても", "う"],  ["いても", "く"],  ["いでも", "ぐ"],
      ["しても", "す"],  ["んでも", "む"],  ["んでも", "ぶ"],
      ["っても", "つ"],  ["っても", "る"],
      ["いながら", "く"], ["ちながら", "つ"], ["りながら", "る"],
      ["みながら", "む"], ["びながら", "ぶ"], ["しながら", "す"],
      ["いすぎる", "く"], ["りすぎる", "る"], ["みすぎる", "む"],
      ["いすぎる", "う"], ["しすぎる", "す"],
    ];

    for (const [suffix, replacement] of godanMap) {
      if (word.endsWith(suffix)) {
        candidates.push(word.slice(0, -suffix.length) + replacement);
      }
    }
  }

  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (KANJI_TO_WANIKANI[candidate]) return candidate;
  }

  return null;
}

// Appeler au chargement
updateStreakDisplay();
updateProfileUI();