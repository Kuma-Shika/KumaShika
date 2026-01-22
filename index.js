const types = [
  { key: "radical", label: "Radical" },
  { key: "kanji", label: "Kanji" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "all", label: "All" }
];

const lang = [
  { key: "jp-en", label: "JP → EN" },
  { key: "en-jp", label: "EN → JP" }
]

const maxLevel = 60;
const grid = document.getElementById("grid");

const buttons = [
  ["radical", "Radical", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "reading"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading"],
  ["kanji", "Kanji", "en-jp", "EN → JP", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading"],
];

for (let level = 1; level <= maxLevel; level++) {
  for (const [typeKey, typeLabel, modeKey, modeLabel, exerciseKey] of buttons) {
    const btn = document.createElement("button");
    btn.className = `btn ${typeKey}`;
    btn.innerHTML = `
      <div class="type">${typeLabel}</div>
      <div class="level">Level ${level}</div>
    `;

    btn.onclick = () => {
      window.location.href =
    `quiz/quiz.html?type=${typeKey}&level=${level}&mode=${modeKey}&ex=${exerciseKey}`;
    };

    grid.appendChild(btn);
  }
}


// =========================
// AUTH SYSTEM (LOCAL)
// =========================

const profileCircle = document.querySelector(".profile-circle");
const authModal = document.getElementById("authModal");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");

// utils
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function setUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

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


// LOGIN
loginBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  const users = getUsers();

  if (!users.includes(name)) {
    authMessage.textContent = "Ce pseudo n'existe pas";
    return;
  }

  setCurrentUser(name);
  authModal.classList.remove("show");
  authModal.classList.add("hidden");
  usernameInput.value = "";
  authMessage.textContent = "";
  updateProfileUI();
};

// CREATE
createBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  const users = getUsers();

  if (users.includes(name)) {
    authMessage.textContent = "Ce pseudo existe déjà";
    return;
  }

  users.push(name);
  setUsers(users);

  console.log("yes"); // demandé 👍
  authMessage.textContent = "Compte créé ✔";
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
