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
  ["radical", "Radical", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "reading"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading"],
  ["kanji", "Kanji", "en-jp", "EN → JP", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading"],
];
const params = new URLSearchParams(window.location.search);
const level_all = params.get("level");   // "radical", "kanji", ou "vocabulary"
const level = level_all.split("-")[0];  // Niveau (1 à 60)
const typeIndex = parseInt(level_all.split("-")[1]) - 1;
const type = buttons[typeIndex][0]; // "radical", "kanji", ou "vocabulary"
const mode = buttons[typeIndex][2];
const exercise = buttons[typeIndex][4];


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




