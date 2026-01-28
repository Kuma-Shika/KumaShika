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
let currentView = "typeSelect"; // "typeSelect", "levelSelect", "exerciseSelect", "gridView"
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

// Vue : Sélection de type (Radical, Kanji, Vocabulary)
function renderTypeSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-list";
  
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

  const btn = document.createElement("button");
  btn.className = `btn btn-large review`;
  
  btn.innerHTML = `
    <div class="type">Reviews</div>
  `;
  
  btn.onclick = () => {
     window.location.href = `quiz/quiz.html?reviews=true`;
  };
  
  grid.appendChild(btn);
}

// Vue : Sélection de niveau (1-60)
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

// Vue : Sélection d'exercice
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

// Vue : Grille desktop (60x7)
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

// Fonction principale de rendu
function render() {
  switch (currentView) {
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
  }
}

// Initialiser
render();

// =========================
// BOUTONS HEADER
// =========================

// Bouton Multiplayer
const multiplayerBtn = document.getElementById("multiplayerBtn");
multiplayerBtn.addEventListener("click", () => {
  window.location.href = "multiplayer/multiplayer.html";
});

// Bouton Grid View
const gridViewBtn = document.getElementById("gridViewBtn");
gridViewBtn.addEventListener("click", () => {
  if (currentView === "gridView") {
    // Retour à la vue type
    currentView = "typeSelect";
    selectedType = null;
    selectedLevel = null;
  } else {
    // Basculer vers la grille
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
  if (e.key === "Enter") {
    loginBtn.click();
  }
});

authModal.addEventListener("click", e => {
  if (e.target === authModal) {
    authModal.classList.remove("show");
    authModal.classList.add("hidden");
    authMessage.textContent = "";
  }
});

updateProfileUI();