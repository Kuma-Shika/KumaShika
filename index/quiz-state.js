// ============================================================
//  quiz-state.js  —  Quiz state factory
//  Call freshQuizState() to get a clean state object.
//  No URLSearchParams here — params come from index.js state.
// ============================================================

export function freshQuizState() {
  return {
    // Questions
    questions:   [],    // Question[]
    failedCards: [],    // Question[] — wrong answers this session
    index:       0,     // current question index
    correct:     0,     // correct answers this session
    redid:       false, // true if we've already retried failed cards

    // Flow control
    awaitingNext: false, // true after first submit, waiting for second press

    // Kanji suggestions (reverse mode)
    suggestionIndex:    -1,
    currentSuggestions: [],
    kanjiOnly:          "", // kanji already typed in the input
  };
}