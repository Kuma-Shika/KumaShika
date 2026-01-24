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

// Variables globales
let currentUser = localStorage.getItem("currentUser");
let currentGameId = null;
let isHost = false;
let unsubscribe = null;

// Éléments DOM
const selectionScreen = document.getElementById("selection-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const joinModal = document.getElementById("join-modal");
const gameCodeDisplay = document.getElementById("game-code");
const playersList = document.getElementById("players-list");
const playerCount = document.getElementById("player-count");
const startGameBtn = document.getElementById("start-game-btn");
const joinError = document.getElementById("join-error");

// Génère un code de partie aléatoire
function generateGameCode() {
  return Math.random().toString(36).substring(2, 5).toUpperCase();
}

// Récupère le nom d'utilisateur
async function getUserName() {
  if (!currentUser) return "Anonyme";
  
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser));
    if (userDoc.exists()) {
      return userDoc.data().id || "Anonyme";
    }
  } catch (error) {
    console.error("Erreur récupération username:", error);
  }
  
  return "Anonyme";
}

// Crée une nouvelle partie
async function createGame() {
  try {
    const gameId = generateGameCode();
    const userName = await getUserName();
    
    const gameRef = doc(db, "parties", gameId);
    
    await setDoc(gameRef, {
      host: currentUser,
      players: [{
        id: currentUser,
        name: userName,
        score: 0
      }],
      status: "waiting",
      createdAt: serverTimestamp(),
      settings: {
        level: "5-1",
        maxPlayers: 8
      }
    });

    currentGameId = gameId;
    isHost = true;
    showLobby(gameId);
    
    console.log("Partie créée:", gameId);
  } catch (error) {
    console.error("Erreur création partie:", error);
    alert("Erreur lors de la création de la partie.");
  }
}

// Rejoint une partie
async function joinGame(gameId) {
  try {
    const gameRef = doc(db, "parties", gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      showError("Cette partie n'existe pas.");
      return false;
    }

    const gameData = gameSnap.data();

    if (gameData.status !== "waiting") {
      showError("Cette partie a déjà commencé.");
      return false;
    }

    if (gameData.players.length >= gameData.settings.maxPlayers) {
      showError("Cette partie est pleine.");
      return false;
    }

    // Vérifie si le joueur n'est pas déjà dans la partie
    const alreadyInGame = gameData.players.some(p => p.id === currentUser);
    if (alreadyInGame) {
      showError("Vous êtes déjà dans cette partie.");
      return false;
    }

    const userName = await getUserName();

    await updateDoc(gameRef, {
      players: arrayUnion({
        id: currentUser,
        name: userName,
        score: 0
      })
    });

    currentGameId = gameId;
    isHost = false;
    showLobby(gameId);
    
    console.log("Partie rejointe:", gameId);
    return true;
  } catch (error) {
    console.error("Erreur rejoindre partie:", error);
    showError("Erreur lors de la connexion à la partie.");
    return false;
  }
}

// Affiche le lobby
function showLobby(gameId) {
  selectionScreen.style.display = "none";
  lobbyScreen.classList.add("active");
  gameCodeDisplay.textContent = gameId;

  // Écoute les changements en temps réel
  const gameRef = doc(db, "parties", gameId);
  unsubscribe = onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      const gameData = snapshot.data();
      
      // Si la partie démarre, redirige
      if (gameData.status === "playing") {
        window.location.href = `../quiz/quiz.html?game=${gameId}`;
      }
      else {
        updatePlayersList(gameData);
        }
    } else {
      // Si la partie n'existe plus, retour à l'écran de sélection
      console.log("Partie supprimée");
      leaveGame();
    }
  });

  // Affiche le bouton démarrer uniquement pour l'hôte
  if (isHost) {
    startGameBtn.style.display = "block";
  }
}

// Met à jour la liste des joueurs
function updatePlayersList(gameData) {
  const players = gameData.players;
  playerCount.textContent = players.length;

  if (players.length === 0) {
    playersList.innerHTML = '<div class="waiting-message">En attente de joueurs...</div>';
    return;
  }

  playersList.innerHTML = players.map((player) => {
    const isHostPlayer = player.id === gameData.host;
    const initial = player.name.charAt(0).toUpperCase();
    
    return `
      <div class="player-card ${isHostPlayer ? 'host' : ''}">
        <div class="player-avatar">${initial}</div>
        <div class="player-info">
          <div class="player-name">
            ${player.id}
            ${isHostPlayer ? '<span class="player-badge">HÔTE</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Quitte la partie
async function leaveGame() {
  if (!currentGameId) return;

  try {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    const gameRef = doc(db, "parties", currentGameId);
    
    if (isHost) {
      // Si hôte, supprime la partie
      await deleteDoc(gameRef);
      console.log("Partie supprimée");
    } else {
      // Sinon, retire le joueur de la liste
      const gameSnap = await getDoc(gameRef);
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const updatedPlayers = gameData.players.filter(p => p.id !== currentUser);
        await updateDoc(gameRef, { players: updatedPlayers });
        console.log("Joueur retiré");
      }
    }

    currentGameId = null;
    isHost = false;
    lobbyScreen.classList.remove("active");
    selectionScreen.style.display = "block";
    startGameBtn.style.display = "none";
  } catch (error) {
    console.error("Erreur quitter partie:", error);
  }
}

// Démarre la partie
async function startGame() {
  if (!isHost || !currentGameId) return;

  try {
    const gameRef = doc(db, "parties", currentGameId);
    await updateDoc(gameRef, { status: "playing" });
    
    console.log("Partie démarrée");
    // La redirection sera gérée par l'écoute temps réel
  } catch (error) {
    console.error("Erreur démarrage partie:", error);
    alert("Erreur lors du démarrage de la partie.");
  }
}

// Affiche une erreur
function showError(message) {
  joinError.textContent = message;
  joinError.classList.add("active");
  setTimeout(() => {
    joinError.classList.remove("active");
  }, 3000);
}

// Copie le code
function copyGameCode() {
  if (!currentGameId) return;
  
  navigator.clipboard.writeText(currentGameId).then(() => {
    const btn = document.getElementById("copy-code-btn");
    const originalText = btn.textContent;
    btn.textContent = "✓ Copié !";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Erreur copie:", err);
  });
}

// Event listeners
document.getElementById("create-game-btn").addEventListener("click", () => {
  console.log("Création partie...");
  createGame();
});

document.getElementById("join-game-btn").addEventListener("click", () => {
  joinModal.classList.add("active");
  document.getElementById("game-code-input").value = "";
  document.getElementById("game-code-input").focus();
});

document.getElementById("cancel-join-btn").addEventListener("click", () => {
  joinModal.classList.remove("active");
});

document.getElementById("confirm-join-btn").addEventListener("click", async () => {
  const code = document.getElementById("game-code-input").value.trim().toUpperCase();
  if (code.length === 3) {
    const success = await joinGame(code);
    if (success) {
      joinModal.classList.remove("active");
    }
  } else {
    showError("Le code doit contenir 3 caractères.");
  }
});

document.getElementById("copy-code-btn").addEventListener("click", copyGameCode);
document.getElementById("leave-game-btn").addEventListener("click", leaveGame);
document.getElementById("start-game-btn").addEventListener("click", startGame);

// Gestion de la touche Entrée dans l'input
document.getElementById("game-code-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("confirm-join-btn").click();
  }
});

// Nettoyage à la fermeture de la page
window.addEventListener("beforeunload", () => {
  if (currentGameId && !isHost) {
    // Pour les non-hôtes, on essaie de se retirer proprement
    leaveGame();
  }
});

console.log("Multiplayer.js chargé");