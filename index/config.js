// ============================================================
//  config.js  —  Single source of truth
//  All constants live here. Never duplicate these elsewhere.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDSqsd9LnK6CX8vMV2vzkx5FbB6tg6PrDM",
  authDomain:        "kumashika-5f5aa.firebaseapp.com",
  projectId:         "kumashika-5f5aa",
  storageBucket:     "kumashika-5f5aa.firebasestorage.app",
  messagingSenderId: "390122758489",
  appId:             "1:390122758489:web:4dc111ac19cb4ff3182c48",
  measurementId:     "G-Y5GND1BNLK",
};

export const MAX_LEVEL = 60;

// ── Navigation views ────────────────────────────────────────
export const VIEWS = {
  MAIN:     "mainSelect",
  TYPE:     "typeSelect",
  LEVEL:    "levelSelect",
  EXERCISE: "exerciseSelect",
  GRID:     "gridView",
  OWN:      "ownSelect",
  OWN_TYPE: "ownType",
  OWN_EXERCISE: "ownExercise",
  OWN_DETAIL: "OWN_DETAIL",
  WORD_DETAIL: "WORD_DETAIL",
  SEARCH: "SEARCH",
  WORD_OCCURRENCES: "WORD_OCCURRENCES",
};

// ── WaniKani type definitions ────────────────────────────────
// Each exercise has an index that matches the Firestore key (level-index).
export const TYPES = {
  radical: {
    label:     "Radical",
    icon:      "🔵",
    sublabel:  "Symbols",
    exercises: [
      { index: 1, label: "JP → EN", sublabel: "MEANING" },
    ],
  },
  kanji: {
    label:     "Kanji",
    icon:      "🀄",
    sublabel:  "Characters",
    exercises: [
      { index: 2, label: "JP → EN", sublabel: "MEANING" },
      { index: 3, label: "JP → EN", sublabel: "READING" },
      { index: 4, label: "EN → JP", sublabel: "REVERSE" },
    ],
  },
  vocabulary: {
    label:     "Vocabulary",
    icon:      "📚",
    sublabel:  "Words",
    exercises: [
      { index: 5, label: "JP → EN", sublabel: "MEANING" },
      { index: 6, label: "JP → EN", sublabel: "READING" },
      { index: 7, label: "EN → JP", sublabel: "REVERSE" },
    ],
  },
};

// Flat list used by the grid view (60×7).
// [cssClass, label, exerciseSubLabel]
export const GRID_COLUMNS = [
  ["radical",    "Radical",    "meaning"],
  ["kanji",      "Kanji",      "meaning"],
  ["kanji",      "Kanji",      "reading"],
  ["kanji",      "Kanji",      "reverse"],
  ["vocabulary", "Vocabulary", "meaning"],
  ["vocabulary", "Vocabulary", "reading"],
  ["vocabulary", "Vocabulary", "reverse"],
];

// ── Design tokens ────────────────────────────────────────────
// ONE place to change any color. CSS classes reference these names.
// The token name matches the CSS class used on buttons.
export const COLORS = {
  wanikani:   { accent: "#F5C842", from: "#FFFDE7", to: "#FFF0B2", text: "#6B4F00" },
  review:     { accent: "#34C982", from: "#ECFDF5", to: "#C6F6DE", text: "#0A4A30" },
  own:        { accent: "#FF7A52", from: "#FFF0EA", to: "#FFD9C7", text: "#5C2500" },
  radical:    { accent: "#2CA8E0", from: "#EBF5FF", to: "#C3E3FC", text: "#0D3A50" },
  kanji:      { accent: "#F0507A", from: "#FFF0F5", to: "#FFD0DE", text: "#4A0010" },
  vocabulary: { accent: "#8B5CF6", from: "#F3EEFF", to: "#E0CEFF", text: "#360A60" },
  // Exercise sub-types (kanji)
  "kanji-meaning": { accent: "#F472B6", from: "#FFF0F5", to: "#FFD6E7" },
  "kanji-reading":  { accent: "#E8448C", from: "#FDF0F8", to: "#F9C6E4" },
  "kanji-reverse":  { accent: "#C4246A", from: "#F9EEF6", to: "#F0AED0" },
  // Exercise sub-types (vocabulary)
  "vocabulary-meaning": { accent: "#A78BFA", from: "#F5F0FF", to: "#E2D4FF" },
  "vocabulary-reading":  { accent: "#7C5CDB", from: "#F0EAFF", to: "#D4BEFF" },
  "vocabulary-reverse":  { accent: "#5B35C0", from: "#EBE3FF", to: "#C4A8FF" },
};