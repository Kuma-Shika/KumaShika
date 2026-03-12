// =========================================================
// STATE — paramètres URL + état mutable central du quiz
// =========================================================
//
// Principe : toutes les parties de l'app importent `quizState`
// et le mutent directement.  Plus de variables globales éparpillées.
// =========================================================

// ----------------------------------------------------------
// Table de correspondance index → config de bouton
// ----------------------------------------------------------
const BUTTON_CONFIG = [
  ["radical",    "Radical",    "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji",      "Kanji",      "jp-en", "JP → EN", "meaning", "meaning"],
  ["kanji",      "Kanji",      "jp-en", "JP → EN", "reading", "reading"],
  ["kanji",      "Kanji",      "en-jp", "EN → JP", "reading", "reverse"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading", "reverse"],
];

// ----------------------------------------------------------
// Lecture des paramètres URL (calculs purs, pas d'effets)
// ----------------------------------------------------------
const params    = new URLSearchParams(window.location.search);
const level_all = params.get("level");
const typeIndex = level_all ? parseInt(level_all.split("-")[1]) - 1 : 0;
const cfg       = BUTTON_CONFIG[typeIndex];

export const urlParams = {
  level_all,
  level:            level_all ? level_all.split("-")[0] : "1",
  own:              params.get("own"),
  isReviews:        params.get("reviews") === "true",
  gameId:           params.get("game"),
  type:             cfg[0],
  mode:             cfg[2],
  exercise:         cfg[4],
  exercise_display: cfg[5],
};

// ----------------------------------------------------------
// État mutable central — toujours muté, jamais réassigné
// ----------------------------------------------------------
export const quizState = {
  // Données du quiz
  questions:    [],   // Question[]
  failedCards:  [],   // Question[] — erreurs de la session
  index:        0,    // question courante
  correct:      0,    // bonnes réponses de la session
  redid:        false,// a-t-on déjà rejoué les erreurs ?

  // Navigation
  awaitingNext: false,// attend-on que l'utilisateur passe à la suivante ?

  // Multijoueur
  isMultiplayer:   urlParams.gameId !== null,
  gameUnsubscribe: null,  // fonction retournée par onSnapshot
  questionTimer:   null,  // setInterval handle
  timeRemaining:   10,

  // Suggestions kanji (input reverse mode)
  suggestionIndex:    -1,
  currentSuggestions: [],
  flagSubmit:         false,
  kanjiOnly:          "",    // partie kanji déjà tapée dans l'input
};
