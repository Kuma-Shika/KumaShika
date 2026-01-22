
// =========================================================
// GESTION DES ÉVÉNEMENTS
// =========================================================

let kanji_only = "";
/**
 * Gère la touche Entrée dans le champ de saisie
 */
input.addEventListener("keydown", (e) => {
  // Ne réagit que sur la touche Entrée
  if (suggestionsEl.classList.contains("hidden")){
    if (e.key !== "Enter") return;

    const q = questions[index];

    // PREMIER APPUI : Validation de la réponse
    if (!awaitingNext) {
      // Récupère et normalise la réponse de l'utilisateur
      const userAnswer = normalize(input.value);
      
      // Vérifie si la réponse est correcte (suffisamment ressemblant genr 1 charctère près)
      
      const isCorrect = q.answers.some(answer =>
      isCloseEnough(normalize(answer), userAnswer)
      );

      // Affiche la carte de réponse
      displayAnswerCard(q);

      // Applique le style selon la réponse
      if (isCorrect) {
        input.classList.add("correct");
        correct++;
      } else {
        input.classList.add("wrong");
      }

      // Met à jour le score affiché
      const answered = index + 1;
      const scorePercent = Math.round((correct / answered) * 100);
      headerScore.textContent = `${scorePercent}%`;

      // Bloque le champ de saisie
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

  if (e.key === "ArrowDown") {
    e.preventDefault();
    suggestionIndex = (suggestionIndex + 1) % currentSuggestions.length;
    updateKanjiSelection();
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    suggestionIndex =
      (suggestionIndex - 1 + currentSuggestions.length) %
      currentSuggestions.length;
    updateKanjiSelection();
  }

  if (e.key === "Enter" && suggestionIndex >= 0) {
    e.preventDefault();
    input.value = kanji_only + currentSuggestions[suggestionIndex];
    hideKanjiSuggestions();
    return;
  }

  [...suggestionsEl.children].forEach((el, i) => {
    el.classList.toggle("selected", i === suggestionIndex);
  });
});


// quand on tape en romaji, convertir en kana
input.addEventListener("input", () => {
  if (!questions.length) return;

  const q = questions[index];
  const raw = input.value.toLowerCase();

  input.value = raw;

  // uniquement pour les questions de lecture
  if (q.kind === "reading") {
    const kana = romajiToKana(raw);
    input.value = kana;
    if (mode === "en-jp"){
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
