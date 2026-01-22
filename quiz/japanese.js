
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