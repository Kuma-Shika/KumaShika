// =========================================================
// MULTIPLAYER — mode multijoueur : timer, panneau de scores,
//               synchronisation Firebase en temps réel
// =========================================================

import { db, dbGet, dbSet, onSnapshot, doc } from "./firebase.js";
import { quizState }  from "./state.js";

// ----------------------------------------------------------
// Initialisation
// ----------------------------------------------------------

/**
 * Vérifie que la partie existe et est en cours, puis lance
 * l'écoute temps-réel du panneau de scores.
 */
export async function initMultiplayer() {
  if (!quizState.isMultiplayer) return;

  try {
    // Laisser Firebase propager le statut
    await new Promise(resolve => setTimeout(resolve, 500));

    const snap = await dbGet(`parties/${quizState.gameId}`);

    if (!snap.exists()) {
      alert("Cette partie n'existe pas.");
      window.location.href = "multiplayer.html";
      return;
    }

    const gameData = snap.data();

    if (gameData.status !== "playing") {
      alert("Cette partie n'a pas encore commencé. Status : " + gameData.status);
      window.location.href = "../multiplayer/multiplayer.html";
      return;
    }

    createScorePanel();

    const gameRef = doc(db, "parties", quizState.gameId);
    quizState.gameUnsubscribe = onSnapshot(gameRef, snapshot => {
      if (snapshot.exists()) updateScorePanel(snapshot.data());
    });

    console.log("Multijoueur initialisé");
  } catch (err) {
    console.error("Erreur initialisation multijoueur:", err);
    alert("Erreur lors du chargement de la partie.");
    window.location.href = "multiplayer.html";
  }
}

// ----------------------------------------------------------
// Panneau de scores
// ----------------------------------------------------------

/**
 * Crée et injecte le panneau de scores dans le DOM.
 */
export function createScorePanel() {
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

/**
 * Met à jour le panneau de scores avec les données Firebase.
 * @param {Object} gameData
 */
export function updateScorePanel(gameData) {
  const playersScores = document.getElementById("players-scores");
  if (!playersScores) return;

  const currentUserId  = localStorage.getItem("currentUser");
  const sortedPlayers  = [...gameData.players].sort((a, b) => b.score - a.score);
  const medals         = ["🥇", "🥈", "🥉"];

  playersScores.innerHTML = sortedPlayers.map((player, i) => `
    <div class="player-score-card ${player.id === currentUserId ? "current-user" : ""}">
      <div class="player-rank">${medals[i] || i + 1}</div>
      <div class="player-score-info">
        <div class="player-score-name">${player.name}</div>
        <div class="player-score-points">${player.score} pts</div>
      </div>
    </div>
  `).join("");
}

// ----------------------------------------------------------
// Timer de question
// ----------------------------------------------------------

/**
 * Lance le compte à rebours de 10 s pour la question courante.
 * Appelle `onTimeUp` si le temps s'écoule sans réponse.
 * @param {Function} onTimeUp  Callback appelé quand le temps expire
 */
export function startQuestionTimer(onTimeUp) {
  if (!quizState.isMultiplayer) return;

  quizState.timeRemaining = 10;
  updateTimerDisplay();

  quizState.questionTimer = setInterval(() => {
    quizState.timeRemaining--;
    updateTimerDisplay();

    if (quizState.timeRemaining <= 0) {
      stopQuestionTimer();
      if (!quizState.awaitingNext) onTimeUp();
    }
  }, 1000);
}

/**
 * Arrête le compte à rebours.
 */
export function stopQuestionTimer() {
  if (quizState.questionTimer) {
    clearInterval(quizState.questionTimer);
    quizState.questionTimer = null;
  }
}

/**
 * Met à jour l'affichage du timer dans le panneau.
 */
function updateTimerDisplay() {
  const el = document.getElementById("timer-display");
  if (!el) return;

  el.textContent = `${quizState.timeRemaining}s`;

  const isUrgent = quizState.timeRemaining <= 3;
  el.style.color      = isUrgent ? "#ef4444" : "#ffffff";
  el.style.fontWeight = isUrgent ? "700"     : "600";
}

// ----------------------------------------------------------
// Score du joueur
// ----------------------------------------------------------

/**
 * Incrémente le score du joueur courant dans la partie Firebase.
 * @param {boolean} isCorrect
 */
export async function updatePlayerScore(isCorrect) {
  if (!quizState.isMultiplayer || !isCorrect) return;

  try {
    const snap = await dbGet(`parties/${quizState.gameId}`);
    if (!snap.exists()) return;

    const currentUserId  = localStorage.getItem("currentUser");
    const updatedPlayers = snap.data().players.map(player =>
      player.id === currentUserId
        ? { ...player, score: player.score + 1 }
        : player
    );

    await dbSet(`parties/${quizState.gameId}`, { players: updatedPlayers });
  } catch (err) {
    console.error("Erreur mise à jour score multijoueur:", err);
  }
}
