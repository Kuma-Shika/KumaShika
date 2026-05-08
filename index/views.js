// ============================================================
//  views.js  —  All render functions
//  Each function is pure: receives (state, navigate) and
//  writes to the #grid element. No global state reads.
// ============================================================

import { TYPES, GRID_COLUMNS, MAX_LEVEL, VIEWS } from "./config.js";
import { setGameLevel, fetchCardOccurrences } from "./db.js";
import { backButton, titleBlock, cardButton, clearGrid, emptyMessage } from "../utils/dom.js";
import { isKnown, inProgress } from "../utils/subject.js";
// En haut de views.js
import { relatedPill, progressPill, pillsSection } from "../components/kanjiPill.js";
import { kanjiItem, vocabItem, radicalItem, searchItem, editableItem } from "../components/relatedItem.js";
import { wordCard } from "../components/wordCard.js";
import { occurrenceItem } from "../components/occurenceItem.js";
import { confirmBar } from "../components/confirmBar.js";
import { hideToggle } from "../components/hideToggle.js";
import { levelHeader } from "../components/levelHeader.js";
import { textCard, folderCard } from "../components/ownCards.js";
import { typeToggle } from "../components/typeToggle.js";
import { selectButton } from "../components/selectButton.js";
import { sortToggle } from "../components/sortToggle.js";
import { getProgressItems } from "../utils/subject.js";



const params = new URLSearchParams(window.location.search);
const gameId = params.get("game");

// ── Shared element builders ──────────────────────────────────

// Navigates to quiz or multiplayer depending on URL params.
async function goToQuiz(levelKey, navigate) {
  if (gameId) {
    await setGameLevel(gameId, levelKey);
    window.location.href = `multiplayer/multiplayer.html?game=${gameId}`;
  } else {
    navigate(VIEWS.QUIZ, { quizParams: { mode: "level", levelKey } });
  }
}

// ── isLevelDone ───────────────────────────────────────────────
function isLevelDone(userData, type, level) {
  return type.exercises.every(ex => {
    const key = `${level}-${ex.index}`;
    return userData?.levels?.[key]?.length > 0;
  });
}

// ── Views ─────────────────────────────────────────────────────


export function renderLevelSelect(userData, { type: typeKey }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const type = TYPES[typeKey];
  grid.appendChild(backButton("← Types", () => navigate(VIEWS.TYPE)));
  grid.appendChild(titleBlock(type.label));

  for (let level = 1; level <= MAX_LEVEL; level++) {
    const btn = document.createElement("button");
    btn.className = `btn ${typeKey}`;
    if (isLevelDone(userData, type, level)) btn.classList.add("done");
    btn.innerHTML = `
      <div class="type">${type.label}</div>
      <div class="level">Level ${level}</div>
    `;
    btn.onclick = () => {
      if (type.exercises.length === 1) {
        goToQuiz(`${level}-${type.exercises[0].index}`, navigate);
      } else {
        navigate(VIEWS.EXERCISE, { type: typeKey, level });
      }
    };
    grid.appendChild(btn);
  }
}

export function renderExerciseSelect(userData, { type: typeKey, level }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";

  const type = TYPES[typeKey];
  grid.appendChild(backButton("← Levels", () => navigate(VIEWS.LEVEL, { type: typeKey })));
  grid.appendChild(titleBlock(`Level ${level} — ${type.label}`));

  for (const ex of type.exercises) {
    const btn = document.createElement("button");
    const sublabelClass = ex.sublabel.toLowerCase();
    btn.className = `btn ${typeKey} ${sublabelClass}`;

    const key = `${level}-${ex.index}`;
    if (userData?.levels?.[key]?.length > 0) btn.classList.add("done");

    btn.innerHTML = `
      <div class="type">${ex.label}</div>
      <div class="level">${ex.sublabel}</div>
    `;
    btn.onclick = () => goToQuiz(key, navigate);
    grid.appendChild(btn);
  }
}

export async function renderGridView(userData, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-desktop";

  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let col = 0; col < GRID_COLUMNS.length; col++) {
      const [cssClass, label, sublabel] = GRID_COLUMNS[col];
      const exerciseIndex = col + 1;

      const btn = document.createElement("button");
      btn.className = `btn ${cssClass}`;
      if (userData?.levels?.[`${level}-${exerciseIndex}`]?.length > 0)
        btn.classList.add("done");

      btn.innerHTML = `
        <div class="type">${label}</div>
        <div class="level">Level ${level}</div>
        <div class="type">${sublabel}</div>
      `;
      btn.onclick = () => goToQuiz(`${level}-${exerciseIndex}`, navigate);
      grid.appendChild(btn);
    }
  }
}

export function renderOwnSelect(userData, navigate, onAddText, onAddFolder, ownPath = []) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  if (ownPath.length === 0) {
    grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));
  } else {
    const parentPath = ownPath.slice(0, -1);
    grid.appendChild(backButton("← " + (parentPath.at(-1) ?? "My Texts"), () =>
      navigate(VIEWS.OWN, { ownPath: parentPath })
    ));
  }

  const header = document.createElement("div");
  header.className = "own-header";
  header.innerHTML = `
    <div class="grid-title" style="grid-column: unset; flex:1;"><h2>${ownPath.length === 0 ? "My Texts" : ownPath.at(-1)}</h2></div>
    <button class="btn-add-own" id="addOwnBtn">＋</button>
    <button class="btn-add-folder" id="addFolderBtn">📁</button>
  `;
  grid.appendChild(header);
  document.getElementById("addOwnBtn").addEventListener("click", onAddText);
  document.getElementById("addFolderBtn").addEventListener("click", onAddFolder);

  let currentNode = userData?.ownLevels || {};
  for (const key of ownPath) {
    currentNode = currentNode[key]?.children || {};
  }

  const keys = Object.keys(currentNode).sort((a, b) => {
    const aIsFolder = currentNode[a].type === "folder" ? 0 : 1;
    const bIsFolder = currentNode[b].type === "folder" ? 0 : 1;
    return aIsFolder - bIsFolder;
  });

  if (keys.length === 0) {
    grid.appendChild(emptyMessage("No texts yet. Press ＋ to add one!"));
    return;
  }

  console.log("Rendering own select with keys:", keys);
  for (const title of keys) {
    const node = currentNode[title];
    if (node.type === "folder") {
      grid.appendChild(folderCard(title, node, () => navigate(VIEWS.OWN, { ownPath: [...ownPath, title] })));
    } else {
      grid.appendChild(textCard(title, node, () => navigate(VIEWS.OWN_DETAIL, { own: title, ownPath })));
    }
  }
}

export function renderOwnDetail(userData, { own, ownPath }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  grid.appendChild(backButton("← " + (ownPath.at(-1) ?? "My Texts"), () =>
    navigate(VIEWS.OWN, { ownPath })
  ));

  const studyBtn = document.createElement("button");
  studyBtn.className = "btn btn-back own-study-btn";
  studyBtn.innerHTML = `<div class="level">📚 Étudier ce texte</div>`;
  studyBtn.onclick = () => navigate(VIEWS.OWN_TYPE, { own, ownPath });
  grid.appendChild(studyBtn);

  const createBtn = document.createElement("button");
  createBtn.className = "btn btn-back own-study-btn";
  createBtn.innerHTML = `<div class="level">＋ Create a card</div>`;
  createBtn.onclick = () => navigate(VIEWS.WORD_EDIT, { wordId: null, own, ownPath, wordEditMode: "create" });
  grid.appendChild(createBtn);

  let hideKnown = false;

  grid.appendChild(hideToggle(hidden => { hideKnown = hidden; renderItems(); }));

  let node = userData?.ownLevels || {};
  for (const key of ownPath) node = node[key]?.children || {};
  const { kanji = [], vocabulary = [] } = node[own] || {};

  // ── Sections créées une seule fois ──────────────────────────
  const kanjiTitle = document.createElement("div");
  kanjiTitle.className = "own-detail-section-title";
  kanjiTitle.textContent = `Kanji`;
  const kanjiGrid = document.createElement("div");
  kanjiGrid.className = "related-container own-detail-grid";

  const vocabTitle = document.createElement("div");
  vocabTitle.className = "own-detail-section-title";
  vocabTitle.textContent = `Vocabulary`;
  const vocabGrid = document.createElement("div");
  vocabGrid.className = "related-container own-detail-grid";

  grid.appendChild(kanjiTitle);
  grid.appendChild(kanjiGrid);
  grid.appendChild(vocabTitle);
  grid.appendChild(vocabGrid);

  // ── Rendu filtrable ──────────────────────────────────────────
  function renderItems() {
    kanjiGrid.innerHTML = "";
    vocabGrid.innerHTML = "";

    const filteredKanji = kanji.filter(id => !hideKnown || !isKnown(id));
    const filteredVocab = vocabulary.filter(id => !hideKnown || !isKnown(id));
    kanjiTitle.textContent = `Kanji (${filteredKanji.length})`;
    vocabTitle.textContent = `Vocabulary (${filteredVocab.length})`;

    kanjiTitle.style.display = filteredKanji.length ? "" : "none";
    kanjiGrid.style.display = filteredKanji.length ? "" : "none";
    vocabTitle.style.display = filteredVocab.length ? "" : "none";
    vocabGrid.style.display = filteredVocab.length ? "" : "none";

    filteredKanji.forEach(id => {
      const item = getSubject(id, userData);
      if (!item) return;
      kanjiGrid.appendChild(
        kanjiItem(item, () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath }))
      );
    });

    filteredVocab.forEach(id => {
      const item = getSubject(id, userData);
      if (!item) return;
      vocabGrid.appendChild(
        vocabItem(item, () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath }))
      );
    });
  }

  renderItems();
}

export function renderWordDetail({ wordId, own, ownPath, searchQuery, fromProgress, progressType, userData }, navigate, onKnown) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const item = getSubject(wordId, userData);
  const known = isKnown(wordId);

  grid.appendChild(backButton(
    fromProgress ? "← Progression" : own ? "← " + own : "← Recherche",
    () => {
      if (fromProgress) navigate(VIEWS.PROGRESS, { progressType });
      else if (own) navigate(VIEWS.OWN_DETAIL, { own, ownPath });
      else navigate(VIEWS.SEARCH, { searchQuery });
    }));

  const actionsBar = document.createElement("div");
  actionsBar.className = "wd-actions-bar";

  const knownBtn = document.createElement("button");
  knownBtn.className = `btn own-study-btn ${known ? "known-btn--active" : "known-btn--inactive"}`;
  knownBtn.innerHTML = `<div class="level">${known ? "✅ Known" : "○ Mark as known"}</div>`;
  knownBtn.onclick = () => onKnown(wordId, known);

  const editBtn = document.createElement("button");
  editBtn.className = "btn wd-edit-btn";
  editBtn.innerHTML = `<div class="level">✏️ Edit</div>`;
  editBtn.onclick = () => navigate(VIEWS.WORD_EDIT, {
    wordId,
    own,
    ownPath,
    wordEditMode: "edit",
  });

  actionsBar.appendChild(knownBtn);
  actionsBar.appendChild(editBtn);
  grid.appendChild(actionsBar);

  if (!item) { grid.appendChild(emptyMessage("Mot introuvable.")); return; }

  const isKanji = item.object === "kanji";

  const cardEl = document.createElement("div");
  cardEl.className = isKanji ? "wd-card wd-card--kanji" : "wd-card wd-card--vocab";
  cardEl.innerHTML = `
    <div class="wd-kind">${isKanji ? "KANJI" : "VOCABULARY"}</div>
    <div class="wd-character">${item.characters}</div>
  `;
  grid.appendChild(cardEl);

  const answerEl = document.createElement("div");
  answerEl.className = isKanji ? "wd-answer wd-answer--kanji" : "wd-answer wd-answer--vocab";
  answerEl.innerHTML = `
    <div class="wd-main">${item.meanings.join(", ")}</div>
    <div class="wd-sub">${(item.readings ?? []).join(", ")}</div>
    ${item.part_of_speech ? `<div class="wd-pos">${item.part_of_speech}</div>` : ""}
  `;
  grid.appendChild(answerEl);

  const occBox = document.createElement("div");
  occBox.className = "wd-occurrences";
  grid.appendChild(occBox);

  fetchCardOccurrences(wordId).then(occurrences => {
    if (!occurrences.length) return;

    const occTitle = document.createElement("div");
    occTitle.className = "wd-occurrences-title";
    occTitle.textContent = "Vu dans";
    occBox.appendChild(occTitle);

    occurrences.forEach(occ => {
      const item = document.createElement("div");
      item.className = "wd-occurrence-item";
      item.innerHTML = `
          <div class="wd-occurrence-source">🎵 ${occ.source}</div>
          <div class="wd-occurrence-sentence">${occ.sentence}</div>
        `;
      occBox.appendChild(item);
    });
  });

  if (isKanji && item.radical_from_kanji?.length) {
    const radBox = document.createElement("div");
    radBox.className = "wd-related";

    const radTitle = document.createElement("div");
    radTitle.className = "wd-occurrences-title";
    radTitle.textContent = "Radicaux";
    grid.appendChild(radTitle);

    item.radical_from_kanji.forEach(id => {
      const rad = getSubject(id, userData);
      if (!rad) return;
      radBox.appendChild(
        radicalItem(rad, () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath }))
      );
    });

    grid.appendChild(radBox);
  }

  const relatedIds = isKanji ? (item.kanji_to_vocab ?? []) : (item.kanji_from_vocab ?? []);
  if (relatedIds.length) {
    const relBox = document.createElement("div");
    relBox.className = "wd-related";
    relatedIds.forEach(id => {
      const rel = getSubject(id, userData);
      if (!rel) return;
      const builder = isKanji ? vocabItem : kanjiItem;
      relBox.appendChild(
        builder(rel, () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath }))
      );
    });
    grid.appendChild(relBox);
  }

  if (item.examples?.length) {
    item.examples.forEach(ex => {
      const wrap = document.createElement("div");
      wrap.className = "wd-example";
      wrap.innerHTML = `
        <div class="wd-example-ja">${ex.ja}</div>
        <div class="wd-example-en">${ex.en}</div>
      `;
      grid.appendChild(wrap);
    });
  }
}

export function renderOwnType(userData, { own, ownPath }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  grid.appendChild(backButton("← Own", () => navigate(VIEWS.OWN, { ownPath })));
  grid.appendChild(titleBlock(own));

  for (const [typeKey, type] of Object.entries(TYPES)) {
    const btn = document.createElement("button");
    btn.className = `btn btn-large ${typeKey}`;
    btn.innerHTML = `
      <div class="card-icon">${type.icon}</div>
      <div class="card-body">
        <div class="card-label">${type.sublabel}</div>
        <div class="card-title">${type.label}</div>
      </div>
      <div class="card-arrow">›</div>
    `;

    btn.onclick = () => {
      if (type.exercises.length === 1) {
        const index = type.exercises[0].index;
        navigate(VIEWS.QUIZ, { quizParams: { mode: "own", ownKey: `${encodeURIComponent(own)}-${index}` } });
      } else {
        navigate(VIEWS.OWN_EXERCISE, { own, type: typeKey, ownPath });
      }
    };

    grid.appendChild(btn);
  }
}

export function renderOwnExercise(userData, { own, type: typeKey, ownPath }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";

  const type = TYPES[typeKey];

  grid.appendChild(
    backButton("← Types", () =>
      navigate(VIEWS.OWN_TYPE, { own, ownPath })
    )
  );

  grid.appendChild(titleBlock(`${own} — ${type.label}`));

  for (const ex of type.exercises) {
    const btn = document.createElement("button");
    const sublabelClass = ex.sublabel.toLowerCase();
    btn.className = `btn ${typeKey} ${sublabelClass}`;
    btn.innerHTML = `
      <div class="type">${ex.label}</div>
      <div class="level">${ex.sublabel}</div>
    `;
    btn.onclick = () => {
      const key = `${encodeURIComponent(own)}-${ex.index}`;
      navigate(VIEWS.QUIZ, { quizParams: { mode: "own", ownKey: key } });
    };
    grid.appendChild(btn);
  }
}


export function renderSearchResults(query, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  if (!query) return;

  const results = Object.values(window.ALL_SUBJECTS || {}).filter(item =>
    item.characters?.startsWith(query) ||
    item.readings?.some(r => r.startsWith(query))
  );

  if (!results.length) {
    grid.appendChild(emptyMessage("No results"));
    return;
  }

  const pillsContainer = document.createElement("div");
  pillsContainer.className = "search-results-grid";
  grid.appendChild(pillsContainer);

  results.forEach(item => {
    pillsContainer.appendChild(
      searchItem(item, async () => {
        const occs = await fetchCardOccurrences(item.id);
        navigate(VIEWS.WORD_OCCURRENCES, {
          wordId: item.id,
          wordOccurrences: occs,
          own: null,
          ownPath: [],
          searchQuery: query,
        });
      })
    );
  });
}

export function renderWordOccurrences({ wordId, wordOccurrences, own, ownPath, searchQuery, userData }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const item = getSubject(wordId, userData);

  grid.appendChild(backButton("← Recherche", () =>
    navigate(VIEWS.SEARCH, { searchQuery })
  ));

  const charEl = document.createElement("div");
  charEl.className = "wd-occurrences-character";
  charEl.textContent = item?.characters ?? wordId;
  grid.appendChild(charEl);

  const showBtn = document.createElement("button");
  showBtn.className = "btn own-study-btn";
  showBtn.innerHTML = `<div class="level">📖 Show card</div>`;
  showBtn.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId, own, ownPath, searchQuery });
  grid.appendChild(showBtn);

  if (!wordOccurrences.length) {
    grid.appendChild(emptyMessage("Aucune occurrence trouvée."));
    return;
  }

  wordOccurrences.forEach(occ => {
    const item = document.createElement("div");
    item.className = "wd-occurrence-item";
    item.innerHTML = `
      <div class="wd-occurrence-source">🎵 ${occ.source}</div>
      <div class="wd-occurrence-sentence">${occ.sentence}</div>
    `;
    grid.appendChild(item);
  });
}

export function renderProgress(userData, progressType, progressSort, navigate, onMarkKnown) {
  clearGrid(grid, "grid-level-select");

  const allItems = getProgressItems(progressType);
  const selected = new Set();
  let currentSort = progressSort;
  let hideKnown = false;

  const bar = confirmBar(selected, onMarkKnown);
  const pills = pillsSection(allItems, progressType, { selected, bar, navigate });

  pills.refresh(currentSort, hideKnown); // rendu initial

  grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));
  grid.appendChild(sortToggle(currentSort, sort => { currentSort = sort; pills.refresh(currentSort, hideKnown); }));
  grid.appendChild(typeToggle(progressType, type => navigate(VIEWS.PROGRESS, { progressType: type })));
  grid.appendChild(hideToggle(hidden => { hideKnown = hidden; pills.refresh(currentSort, hideKnown); }));
  grid.appendChild(selectButton(selected, bar, () => pills.refresh(currentSort, hideKnown)));
  grid.appendChild(bar);
  grid.appendChild(pills);
}

export function renderWordEdit({ wordId, own, ownPath, mode, userData }, navigate, onSave) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const isEdit = mode === "edit";
  const base = isEdit ? (window.ALL_SUBJECTS?.[wordId] ?? window.CUSTOM_SUBJECTS?.[wordId]) : null;
  const overrides = isEdit ? (userData?.overrides?.[String(wordId)] ?? {}) : {};
  const current = base ? { ...base, ...overrides } : {};

  const form = {
    characters: current.characters ?? "",
    object: current.object ?? "vocabulary",
    readings: current.readings ?? [],
    meanings: current.meanings ?? [],
    examples: current.examples ?? [{ ja: "", en: "" }],
    components: current.radical_from_kanji ?? current.kanji_from_vocab ?? [],
  };

  grid.appendChild(backButton(
    isEdit ? "← Card" : "← Back",
    () => isEdit
      ? navigate(VIEWS.WORD_DETAIL, { wordId, own, ownPath })
      : navigate(VIEWS.OWN_DETAIL, { own, ownPath })
  ));

  const cardEl = document.createElement("div");
  cardEl.className = `wd-card wd-card--${form.object === "kanji" ? "kanji" : "vocab"} wd-card--edit`;
  cardEl.innerHTML = `
    <div class="wd-edit-row">
      <select class="wd-edit-select" id="editType">
        <option value="vocabulary" ${form.object === "vocabulary" ? "selected" : ""}>Vocabulary</option>
        <option value="kanji"      ${form.object === "kanji" ? "selected" : ""}>Kanji</option>
        <option value="radical"    ${form.object === "radical" ? "selected" : ""}>Radical</option>
      </select>
    </div>
    <input class="wd-edit-character" id="editCharacter"
      placeholder="字" value="${form.characters}" ${isEdit ? "readonly" : ""} />
  `;
  grid.appendChild(cardEl);

  cardEl.querySelector("#editType").onchange = (e) => {
    form.object = e.target.value;
    cardEl.className = `wd-card wd-card--${form.object === "kanji" ? "kanji" : "vocab"} wd-card--edit`;
  };

  const answerEl = document.createElement("div");
  answerEl.className = `wd-answer wd-answer--${form.object === "kanji" ? "kanji" : "vocab"}`;
  answerEl.innerHTML = `
    <div class="wd-edit-label">Meanings</div>
    <input class="wd-edit-input" id="editMeanings"
      placeholder="e.g. water, liquid"
      value="${form.meanings.join(", ")}" />
    <div class="wd-edit-label" style="margin-top:12px">Readings</div>
    <input class="wd-edit-input" id="editReadings"
      placeholder="e.g. みず"
      value="${form.readings.join(", ")}" />
  `;
  grid.appendChild(answerEl);

  const exampleEl = document.createElement("div");
  exampleEl.className = "wd-example";
  exampleEl.innerHTML = `
    <div class="wd-edit-label">Example (Japanese)</div>
    <input class="wd-edit-input" id="editExJa"
      placeholder="e.g. 水を飲む"
      value="${form.examples[0]?.ja ?? ""}" />
    <div class="wd-edit-label" style="margin-top:12px">Example (English)</div>
    <input class="wd-edit-input" id="editExEn"
      placeholder="e.g. To drink water"
      value="${form.examples[0]?.en ?? ""}" />
  `;
  grid.appendChild(exampleEl);

  const compSection = document.createElement("div");
  compSection.className = "wd-edit-components";

  const compTitle = document.createElement("div");
  compTitle.className = "wd-edit-label wd-edit-label--section";
  compTitle.textContent = "Components";
  compSection.appendChild(compTitle);

  const selectedPills = document.createElement("div");
  selectedPills.className = "wd-related";
  compSection.appendChild(selectedPills);

  function renderSelectedComponents() {
    selectedPills.innerHTML = "";
    form.components.forEach(id => {
      const rel = window.ALL_SUBJECTS?.[id] ?? window.CUSTOM_SUBJECTS?.[id];
      if (!rel) return;
      const typeClass = rel.object === "radical" ? "radical-item" : "kanji-item";
      selectedPills.appendChild(
        editableItem(rel, typeClass, () => {
          form.components = form.components.filter(c => c !== id);
          renderSelectedComponents();
        })
      );
    });
  }
  renderSelectedComponents();

  const compSearchInput = document.createElement("input");
  compSearchInput.className = "wd-edit-input";
  compSearchInput.placeholder = "Search a radical or kanji...";
  compSection.appendChild(compSearchInput);

  const compResults = document.createElement("div");
  compResults.className = "wd-related wd-edit-search-results";
  compSection.appendChild(compResults);

  compSearchInput.oninput = () => {
    const q = compSearchInput.value.toLowerCase();
    compResults.innerHTML = "";
    if (!q) return;

    const results = Object.values(window.ALL_SUBJECTS || {})
      .filter(item =>
        (item.object === "radical" || item.object === "kanji") &&
        (item.characters?.includes(q) || item.meanings?.some(m => m.toLowerCase().includes(q)))
      )
      .slice(0, 10);

    results.forEach(item => {
      const v = document.createElement("div");
      v.className = `related-item ${item.object === "radical" ? "radical-item" : "kanji-item"}`;
      v.style.opacity = form.components.includes(item.id) ? "0.4" : "1";
      v.innerHTML = `
        <div class="related-item-character">${item.characters}</div>
        <div class="related-item-meaning">${item.meanings[0]}</div>
      `;
      v.onclick = () => {
        if (!form.components.includes(item.id)) {
          form.components.push(item.id);
          renderSelectedComponents();
        }
        compSearchInput.value = "";
        compResults.innerHTML = "";
      };
      compResults.appendChild(v);
    });
  };

  grid.appendChild(compSection);

  const errorEl = document.createElement("div");
  errorEl.className = "wd-edit-error hidden";
  grid.appendChild(errorEl);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn own-study-btn";
  saveBtn.innerHTML = `<div class="level">${isEdit ? "💾 Save changes" : "✅ Create card"}</div>`;
  saveBtn.onclick = () => {
    form.characters = grid.querySelector("#editCharacter").value.trim();
    form.object = grid.querySelector("#editType").value;
    form.meanings = grid.querySelector("#editMeanings").value.split(",").map(s => s.trim()).filter(Boolean);
    form.readings = grid.querySelector("#editReadings").value.split(",").map(s => s.trim()).filter(Boolean);
    form.examples = [{
      ja: grid.querySelector("#editExJa").value.trim(),
      en: grid.querySelector("#editExEn").value.trim(),
    }];

    if (!isEdit) {
      const missing = [];
      if (!form.characters) missing.push("character");
      if (!form.meanings.length) missing.push("meaning");
      if (!form.readings.length) missing.push("reading");
      if (!form.examples[0].ja) missing.push("Japanese example");
      if (!form.examples[0].en) missing.push("English example");
      if (!form.components.length) missing.push("at least one component");

      if (missing.length) {
        errorEl.textContent = `Missing: ${missing.join(", ")}`;
        errorEl.classList.remove("hidden");
        return;
      }
    }

    errorEl.classList.add("hidden");

    const data = isEdit
      ? {
        ...(form.meanings.length ? { meanings: form.meanings } : {}),
        ...(form.readings.length ? { readings: form.readings } : {}),
        ...(form.examples[0].ja ? { examples: form.examples } : {}),
      }
      : {
        characters: form.characters,
        object: form.object,
        meanings: form.meanings,
        readings: form.readings,
        examples: form.examples,
        [form.object === "vocabulary" ? "kanji_from_vocab" : "radical_from_kanji"]: form.components,
      };

    onSave(mode, wordId, data);
  };
  grid.appendChild(saveBtn);
}

// ── Quiz view ─────────────────────────────────────────────────
// Delegates entirely to quiz-logic.js, passing the grid container.
export async function renderQuiz(quizParams, userData, navigate) {
  grid.innerHTML = "";
  grid.className = "grid quiz-view";
  const { renderQuizInContainer } = await import("./quiz-logic.js");
  renderQuizInContainer(grid, quizParams, userData, navigate);
}

function getSubject(id, userData) {
  const base = window.ALL_SUBJECTS[id] ?? window.CUSTOM_SUBJECTS[id];
  const override = userData?.overrides?.[id];
  return override ? { ...base, ...override } : base;
}


export function renderProgressExercise({ studyMode, studyLevelKey, progressType }, userData, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";

  const typeKey = (progressType === "vocab" || progressType === "vocabulary") ? "vocabulary" : "kanji";
  const levelLabel = studyMode === "jlpt" ? `JLPT ${studyLevelKey}` : `Level ${studyLevelKey}`;

  grid.appendChild(backButton("← Progress", () => navigate(VIEWS.PROGRESS)));
  grid.appendChild(titleBlock(`${levelLabel} — ${TYPES[typeKey].label}`));

  for (const ex of TYPES[typeKey].exercises) {
    const btn = document.createElement("button");
    const sublabelClass = ex.sublabel.toLowerCase();
    btn.className = `btn ${typeKey} ${sublabelClass}`;
    btn.innerHTML = `
      <div class="type">${ex.label}</div>
      <div class="level">${ex.sublabel}</div>
    `;
    btn.onclick = () => {
      if (studyMode === "jlpt") {
        navigate(VIEWS.QUIZ, {
          quizParams: { mode: "jlpt", jlptLevel: studyLevelKey, exerciseType: sublabelClass, progressType }
        });
      } else {
        navigate(VIEWS.QUIZ, {
          quizParams: { mode: "level", levelKey: `${studyLevelKey}-${ex.index}` }
        });
      }
    };
    grid.appendChild(btn);
  }
}
