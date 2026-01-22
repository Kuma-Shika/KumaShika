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

const user = getCurrentUser();
let userData = null;

if (user) {
  userData = await getUserData(user);
}
for (let level = 1; level <= maxLevel; level++) {
  for (let type = 1; type <= 7; type++) {
    const btn = document.createElement("button");
    btn.className = `btn ${buttons[type - 1][0]}`;
    btn.innerHTML = `
      <div class="type">${buttons[type - 1][1]}</div>
      <div class="level">Level ${level}</div>
    `;
    const hasSuccess =
    userData?.levels?.[`${level}-${type}`] &&
    userData.levels[`${level}-${type}`].length > 0;
    if (hasSuccess) {
      btn.classList.add("done");
    }

    grid.appendChild(btn);

    btn.onclick = () => {
      window.location.href =
    `quiz/quiz.html?level=${level}-${type}`;
    };
  }
}



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

  console.log("yes");
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
