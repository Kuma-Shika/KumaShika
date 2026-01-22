// =========================================================
// VARIABLES GLOBALES
// =========================================================
fetch("../../assets/romaji_to_kana.json")
  .then(r => r.json())
  .then(map => {
    ROMAJI_MAP = map;
    console.log("IME chargééééééééé", ROMAJI_MAP);
  });

fetch("../../assets/reading_to_kanji.json")
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
const params = new URLSearchParams(window.location.search);
const type = params.get("type");   // "radical", "kanji", ou "vocabulary"
const level = params.get("level"); // Numéro du niveau
const mode = params.get("mode");
const exercise = params.get("ex");


const suggestionsEl = document.getElementById("kanji-suggestions");
let suggestionIndex = -1;
let currentSuggestions = [];
