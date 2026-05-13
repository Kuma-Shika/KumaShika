// ============================================================
//  quiz-state.js  —  Quiz state factory
//  Call freshQuizState() to get a clean state object.
//  No URLSearchParams here — params come from index.js state.
// ============================================================

export function freshQuizState() {
  return {
    questions: [],
    failedCards: [],
    index: 0,
    correct: 0,
    total: 0,     // total réponses données
    lastCorrect: false,
    newWordsCorrect: 0,     // daily uniquement
    totalReviews: 0,     // reviews : total du jour
    reviewsCorrect: 0,     // reviews : bonnes réponses du jour
    redid: false,
    awaitingNext: false,
    suggestionIndex: -1,
    currentSuggestions: [],
    kanjiOnly: "",
  };
}