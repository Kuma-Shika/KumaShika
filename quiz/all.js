// =========================================================
// VARIABLES GLOBALES
// =========================================================
let ROMAJI_MAP = {};
let KANA_TO_KANJI = {};
fetch("../assets/romaji_to_kana.json")
  .then(r => r.json())
  .then(map => {
    ROMAJI_MAP = map;
    console.log("IME chargééééééééé", ROMAJI_MAP);
  });

fetch("../assets/reading_to_kanji.json")
  .then(r => r.json())
  .then(map => {
    KANA_TO_KANJI = map;
    console.log("Dictionnaire kana->kanji chargé", KANA_TO_KANJI);
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
const answerTags = document.getElementById("answer-tags");

// =========================================================
// RÉCUPÉRATION DES PARAMÈTRES URL
// =========================================================

// Exemple d'URL : quiz.html?type=kanji&level=1
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
const level_all = params.get("level");   // "radical", "kanji", ou "vocabulary"
const level = level_all.split("-")[0];  // Niveau (1 à 60)
const typeIndex = parseInt(level_all.split("-")[1]) - 1;
const type = buttons[typeIndex][0]; // "radical", "kanji", ou "vocabulary"
const mode = buttons[typeIndex][2];
const exercise = buttons[typeIndex][4];
const exercise_display = buttons[typeIndex][5];


const suggestionsEl = document.getElementById("kanji-suggestions");
let suggestionIndex = -1;
let currentSuggestions = [];


// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDSqsd9LnK6CX8vMV2vzkx5FbB6tg6PrDM",
    authDomain: "kumashika-5f5aa.firebaseapp.com",
    projectId: "kumashika-5f5aa",
    storageBucket: "kumashika-5f5aa.firebasestorage.app",
    messagingSenderId: "390122758489",
    appId: "1:390122758489:web:4dc111ac19cb4ff3182c48",
    measurementId: "G-Y5GND1BNLK"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);
  window.db = db; // Make db globally accessible

  import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp, 
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

























// =========================================================
// FONCTIONS UTILITAIRES
// =========================================================

/**
 * Mélange aléatoirement un tableau
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} Le même tableau mélangé
 */
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

/**
 * Normalise une chaîne pour la comparaison
 * (enlève les espaces et met en minuscules)
 * @param {string} str - Chaîne à normaliser
 * @returns {string} Chaîne normalisée
 */
function normalize(str) {
  return str.trim().toLowerCase();
}

/**
 * Met en surbrillance un mot dans une phrase
 * @param {string} sentence - La phrase complète
 * @param {string} word - Le mot à mettre en surbrillance
 * @returns {string} HTML avec le mot surligné
 */
function highlightWord(sentence, word) {
  if (!sentence || !word) return sentence;

  // Échappe les caractères spéciaux pour la regex
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");

  return sentence.replace(regex, `<strong>${word}</strong>`);
}

/**
 * Supprime les balises <radical>, <kanji>, <vocabulary>, <kana-vocabulary>
 * tout en conservant le texte interne
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  if (typeof text !== "string") return text;

  return text.replace(/<[^>]*>/g, "");
}


function isCloseEnough(a, b) {
  if (a === b) return true;

  // trop différent → non
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















// Gere le japonais
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

  suggestionIndex = 0; // 👈 sélection logique
  updateKanjiSelection();

  kanjis.forEach((k, i) => {
    const div = document.createElement("div");
    div.className = "kanji-option";
    div.textContent = k;

    if (i === 0) {
      div.classList.add("selected"); // 👈 sélection visuelle
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
  suggestionIndex = -1;   // 👈 important
  currentSuggestions = [];
}

function updateKanjiSelection() {
  const items = [...suggestionsEl.children];

  items.forEach((el, i) => {
    el.classList.toggle("selected", i === suggestionIndex);

    if (i === suggestionIndex) {
      el.scrollIntoView({
        block: "nearest",   // 👈 ne scroll que si nécessaire
        behavior: "smooth"  // optionnel
      });
    }
  });
}








// =========================================================
// GESTION DES ÉVÉNEMENTS
// =========================================================

/**
 * Met à jour le badge de score avec la couleur appropriée
 */
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

// Fonction qui gère la validation
function handleSubmit() {
  // Si menu kanji ouvert, ne rien faire
  if (!suggestionsEl.classList.contains("hidden")) {
    return;
  }

  const q = questions[index];

  // PREMIER APPUI : Validation de la réponse
  if (!awaitingNext) {
    const userAnswer = normalize(input.value);
    
    if (userAnswer === "") {
      return;
    }

    let isCorrect = false;
    if (q.kind === "meaning") {
      isCorrect = q.answers.some(answer =>
        isCloseEnough(normalize(answer), userAnswer)
      );
    } else {
      isCorrect = q.answers.some(answer =>
        normalize(answer) === userAnswer
      );
    }

    displayAnswerCard(q);

    if (isCorrect) {
      input.classList.add("correct");
      correct++;
    } else {
      input.classList.add("wrong");
    }

    const answered = index + 1;
    const scorePercent = Math.round((correct / answered) * 100);
    headerScore.textContent = `${scorePercent}%`;
    updateScoreBadge();

    input.readOnly = true;
    awaitingNext = true;
    return;
  }

  // DEUXIÈME APPUI : Passer à la question suivante
  index++;
  updateHeader();
  resetEverything();
  showQuestion();
}

// Clic sur le bouton
submitBtn.addEventListener("click", handleSubmit);

// Focus automatique sur l'input pour toute saisie
document.addEventListener("keydown", (e) => {
  // Ignorer les touches de modification et navigation
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["Tab", "Escape", "F5"].includes(e.key)) return;
  
  // Gestion de l'Entrée
  if (e.key === "Enter") {
    e.preventDefault();
    
    // Si menu kanji ouvert, valider le kanji sélectionné
    if (!suggestionsEl.classList.contains("hidden") && suggestionIndex >= 0) {
      input.value = kanji_only + currentSuggestions[suggestionIndex];
      hideKanjiSuggestions();
      input.focus();
      return;
    }
    
    // Sinon, valider la réponse
    handleSubmit();
    return;
  }
  
  // Pour toute autre touche, focus sur l'input si pas déjà focus
  if (document.activeElement !== input && !input.readOnly) {
    input.focus();
  }
});

let kanji_only = "";

// Gestion des flèches dans l'input pour les suggestions
input.addEventListener("keydown", (e) => {
  // Gestion des suggestions de kanji
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

// Conversion romaji en kana
input.addEventListener("input", () => {
  if (!questions.length) return;

  const q = questions[index];
  const raw = input.value.toLowerCase();

  input.value = raw;

  // uniquement pour les questions de lecture
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



/**
 * Construit le tableau de questions à partir des données
 * @param {Array} data - Données brutes de l'API WaniKani
 * @returns {Array} Tableau de questions formatées
 */
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
      radical_to_kanji: item.radical_to_kanji || [],
      radical_from_kanji: item.radical_from_kanji || [],
      kanji_to_vocab: item.kanji_to_vocab || [],
      kanji_from_vocab: item.kanji_from_vocab || [],
      kind: exercise,
      display_kind: exercise_display,
      object: item.object
    }

    // ---------- RADICAL ----------
    if (item.object === "radical") {
        res.prompt = item.characters;
        res.answers = item.meanings;
    }

    // ---------- KANJI ----------
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

/**
 * Réinitialise l'affichage de la carte de réponse
 */
function resetAnswerCard() {
  answerCard.classList.add("hidden");
  answerCard.className = "hidden";
  answerMain.textContent = "";
  answerSub.textContent = "";
  answerMnemotechnic.textContent = "";
  answerExamples.innerHTML = "";
  answerTags.innerHTML = "";
}

/**
 * Affiche la question actuelle
 */
function showQuestion() {
  //hideKanjiSuggestions();
  // Réinitialise l'état du champ de saisie
  input.value = "";
  input.className = "";
  input.readOnly = false;
  input.focus();

  // Cache le feedback et la carte de réponse
  //feedback.textContent = "";

  // Réinitialise l'état d'attente
  awaitingNext = false;

  // Si toutes les questions sont terminées, affiche le résultat
  if (index >= questions.length) {
    showResult();
    return;
  }

  // Récupère la question actuelle
  const q = questions[index];

  // Affiche la question
  questionEl.textContent = q.prompt;
  kind.textContent = q.display_kind;

  // Applique le thème de couleur (ex: "kanji-meaning")
  card.className = `${q.object}-${q.kind}`;
}

/**
 * Met à jour l'affichage de la progression dans l'en-tête
 */
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
/**
 * Affiche la carte de réponse avec les informations
 * @param {Object} q - La question actuelle
 */
function displayAnswerCard(q) {
  // Affiche la réponse principale
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

  // Affiche les exemples s'il y en a
  if (q.examples.length > 0) {
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

  // Applique le thème de couleur et affiche la carte
  //answerCard.className = `${q.object}-${q.kind}`;
}

/**
 * Affiche le résultat final du quiz
 */


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

  // Affiche le message de fin
  questionEl.textContent = "Quiz terminé !";
  kind.textContent = "";

  // Cache le champ de saisie
  input.classList.add("hidden");

  // Crée les éléments de résultat
  const scoreDiv = document.createElement("div");
  scoreDiv.className = "final-score";
  scoreDiv.textContent = `Score final : ${percent}%`;

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "final-details";
  detailsDiv.textContent = `${correct} / ${questions.length} réponses correctes`;

  // Affiche le score final
  feedback.appendChild(scoreDiv);
  feedback.appendChild(detailsDiv);

  // Met à jour l'en-tête
  headerProgress.textContent = "Terminé";
  headerScore.textContent = `${percent}%`;
  updateScoreBadge();
  console.log(correct, questions.length);
  if (correct === questions.length) {
    console.log("Niveau réussi !");
    markLevelSuccess(`${level_all}`);
  }
}




















// =========================================================
// INITIALISATION
// =========================================================

/**
 * Initialise l'en-tête avec le type et le niveau
 */
function initHeader() {
  headerType.textContent = type.toUpperCase();
  headerLevel.textContent = `Level ${level}`;
  
  // Pour affichage mobile
  const headerRight = document.getElementById("header-right");
  headerRight.setAttribute('data-type', type.toUpperCase());
  headerRight.setAttribute('data-level', `Level ${level}`);
}

/**
 * Charge les données et démarre le quiz
 */
function loadQuizData() {
  // Charge le fichier JSON correspondant au type et niveau
  fetch(`../data/${level}_${type}.json`)
    .then(response => response.json())
    .then(data => {
      // Construit et mélange les questions
      questions = buildQuestions(data, mode, exercise);
      shuffle(questions);
      
      // Met à jour l'affichage
      updateHeader();
      showQuestion();
    })

}

// Démarre l'application
initHeader();
loadQuizData();