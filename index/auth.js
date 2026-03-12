// ============================================================
//  auth.js  —  Authentication system
//  Manages localStorage session + auth modal UI.
//  Exports: getCurrentUser, initAuth
// ============================================================

import { fetchUser, userExists, createUser } from "./db.js";

// ── Session helpers (localStorage) ──────────────────────────

export function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

function setCurrentUser(name) {
  localStorage.setItem("currentUser", name);
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

// ── Profile circle UI ────────────────────────────────────────

function updateProfileCircle() {
  const user   = getCurrentUser();
  const circle = document.getElementById("profileCircle");
  circle.textContent = user ? user.slice(0, 2).toUpperCase() : "👤";
}

// ── Modal helpers ────────────────────────────────────────────

function showModal() {
  const modal = document.getElementById("authModal");
  modal.classList.replace("hidden", "show") || modal.classList.add("show");
}

function hideModal() {
  const modal = document.getElementById("authModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");
}

function setLoggedInState(username) {
  document.getElementById("usernameInput").classList.add("hidden");
  document.getElementById("loginBtn").classList.add("hidden");
  document.getElementById("createBtn").classList.add("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");
  document.getElementById("authMessage").textContent = `Connected as ${username}`;
}

function setLoggedOutState() {
  document.getElementById("usernameInput").classList.remove("hidden");
  document.getElementById("loginBtn").classList.remove("hidden");
  document.getElementById("createBtn").classList.remove("hidden");
  document.getElementById("logoutBtn").classList.add("hidden");
  document.getElementById("authMessage").textContent = "";
  document.getElementById("usernameInput").focus();
}

// ── initAuth ─────────────────────────────────────────────────
// Call once at startup. onLogin is called with fresh userData
// after a successful login / account creation.

export function initAuth(onLogin) {
  updateProfileCircle();

  const authModal      = document.getElementById("authModal");
  const usernameInput  = document.getElementById("usernameInput");
  const authMessage    = document.getElementById("authMessage");

  // Open modal
  document.getElementById("profileCircle").addEventListener("click", () => {
    const user = getCurrentUser();
    showModal();
    user ? setLoggedInState(user) : setLoggedOutState();
  });

  // Close on backdrop click
  authModal.addEventListener("click", e => {
    if (e.target === authModal) {
      hideModal();
      authMessage.textContent = "";
    }
  });

  // Enter key = login
  usernameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
  });

  // Log in
  document.getElementById("loginBtn").addEventListener("click", async () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    if (!await userExists(name)) {
      authMessage.textContent = "Username not found.";
      return;
    }
    setCurrentUser(name);
    hideModal();
    updateProfileCircle();
    onLogin(await fetchUser(name));
  });

  // Create account
  document.getElementById("createBtn").addEventListener("click", async () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    if (await userExists(name)) {
      authMessage.textContent = "Username already taken.";
      return;
    }
    await createUser(name);
    setCurrentUser(name);
    hideModal();
    updateProfileCircle();
    onLogin(await fetchUser(name));
  });

  // Log out
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearCurrentUser();
    hideModal();
    updateProfileCircle();
    onLogin(null);
  });
}
