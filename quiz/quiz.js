
// =========================================================
// INITIALISATION
// =========================================================

/**
 * Initialise l'en-tête avec le type et le niveau
 */
function initHeader() {
  headerType.textContent = type.toUpperCase();
  headerLevel.textContent = `Level ${level}`;
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