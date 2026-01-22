

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
  kind.textContent = q.kind;

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
  console.log(correct, questions.length);
  if (correct === questions.length) {
    console.log("Niveau réussi !");
    markLevelSuccess(`${level_all}`);
  }
}
