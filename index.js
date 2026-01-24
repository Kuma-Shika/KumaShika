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

// Structure des types avec leurs exercices
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

const user = getCurrentUser();
let userData = null;

// État de navigation
let currentView = "desktop"; // "desktop", "typeSelect", "levelSelect", "exerciseSelect"
let selectedType = null;
let selectedLevel = null;

// Détecter si on est sur mobile
function isMobile() {
  return window.innerWidth <= 768;
}

// Initialiser les données utilisateur
if (user) {
  userData = await getUserData(user);
}

// Fonction principale de rendu
function render() {
  if (isMobile()) {
    if (currentView === "desktop") {
      currentView = "typeSelect";
    }
    
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
    }
  } else {
    renderDesktop();
  }
}

// Vue desktop (grille complète 60x7)
function renderDesktop() {
  currentView = "desktop";
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

      grid.appendChild(btn);

      btn.onclick = () => {
        window.location.href = `quiz/quiz.html?level=${level}-${type}`;
      };
    }
  }
}

// Vue 1 : Sélection du type (Radical, Kanji, Vocabulary)
function renderTypeSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-type-select";
  
  Object.keys(types).forEach(typeKey => {
    const type = types[typeKey];
    const btn = document.createElement("button");
    btn.className = `btn btn-large ${typeKey}`;
    
    // Compter combien de niveaux sont complétés pour ce type
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
  btn.className = `btn btn-large multiplayer`;
    
  btn.innerHTML = `
    <div class="type">Multiplayer</div>

  `;
  
  btn.onclick = () => {
    window.location.href = `multiplayer/multiplayer.html`;
  };
  grid.appendChild(btn);

}

// Vue 2 : Sélection du niveau (1-60)
function renderLevelSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";
  
  const type = types[selectedType];
  
  // Bouton retour
  const backBtn = createBackButton("← Types", () => {
    currentView = "typeSelect";
    selectedType = null;
    render();
  });
  grid.appendChild(backBtn);
  
  // Titre
  const title = document.createElement("div");
  title.className = "grid-title";
  title.innerHTML = `<h2>${type.label}</h2>`;
  grid.appendChild(title);
  
  // Boutons de niveau
  for (let level = 1; level <= maxLevel; level++) {
    const btn = document.createElement("button");
    btn.className = `btn ${selectedType}`;
    
    // Vérifier si tous les exercices sont complétés
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
    
    btn.onclick = () => {
      if (type.exercises.length === 1) {
        // Radical : aller directement au quiz
        window.location.href = `quiz/quiz.html?level=${level}-${type.exercises[0].index}`;
      } else {
        // Kanji/Vocabulary : afficher les exercices
        selectedLevel = level;
        currentView = "exerciseSelect";
        render();
      }
    };
    
    grid.appendChild(btn);
  }
}

// Vue 3 : Sélection de l'exercice (meaning/reading/reverse)
function renderExerciseSelect() {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";
  
  const type = types[selectedType];
  
  // Bouton retour
  const backBtn = createBackButton("← Levels", () => {
    currentView = "levelSelect";
    selectedLevel = null;
    render();
  });
  grid.appendChild(backBtn);
  
  // Titre
  const title = document.createElement("div");
  title.className = "grid-title";
  title.innerHTML = `<h2>Level ${selectedLevel} - ${type.label}</h2>`;
  grid.appendChild(title);
  
  // Boutons d'exercice
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
    
    btn.onclick = () => {
      window.location.href = `quiz/quiz.html?level=${selectedLevel}-${exercise.index}`;
    };
    
    grid.appendChild(btn);
  });
}

// Créer un bouton retour
function createBackButton(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn btn-back";
  btn.innerHTML = `<div class="level">${text}</div>`;
  btn.onclick = onClick;
  return btn;
}

// Initialiser
render();

// Re-render au redimensionnement
window.addEventListener("resize", () => {
  const wasMobile = currentView !== "desktop";
  const nowMobile = isMobile();
  
  if (wasMobile !== nowMobile) {
    currentView = "desktop";
    selectedType = null;
    selectedLevel = null;
    render();
  }
});

// =========================
// AUTH SYSTEM (LOCAL)
// =========================

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp, 
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

const profileCircle = document.querySelector(".profile-circle");
const authModal = document.getElementById("authModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");

function setCurrentUser(name) {
  localStorage.setItem("currentUser", name);
}

function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

function logout() {
  localStorage.removeItem("currentUser");
  updateProfileUI();
}

// UI
function updateProfileUI() {
  const user = getCurrentUser();

  if (user) {
    profileCircle.textContent = user.slice(0, 2).toUpperCase();
  } else {
    profileCircle.textContent = "👤";
  }
}

// open / click profile
profileCircle.addEventListener("click", () => {
  const user = getCurrentUser();

  authModal.classList.remove("hidden");
  authModal.classList.add("show");

  if (user) {
    // mode connecté
    usernameInput.classList.add("hidden");
    loginBtn.classList.add("hidden");
    createBtn.classList.add("hidden");

    authMessage.textContent = `Connected as ${user}`;
    logoutBtn.classList.remove("hidden");
  } else {
    // mode login
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
  
  // Recharger les données et re-render
  userData = await getUserData(name);
  render();
};

// CREATE
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
  
  // Recharger les données et re-render
  userData = await getUserData(name);
  render();
};

logoutBtn.onclick = () => {
  logout();
  authModal.classList.remove("show");
  authModal.classList.add("hidden");
};

// ENTER = login
usernameInput.addEventListener("keydown", e => {
  if (e.key === "Enter"){
    loginBtn.click();
    authModal.classList.remove("show");
    authModal.classList.add("hidden");
  }
});

// close modal on outside click
authModal.addEventListener("click", e => {
  if (e.target === authModal) {
    authModal.classList.remove("show");
    authModal.classList.add("hidden");
    authMessage.textContent = "";
  }
});

// init
updateProfileUI();