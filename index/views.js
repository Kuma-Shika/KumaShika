// ============================================================
//  views.js  —  All render functions
//  Each function is pure: receives (state, navigate) and
//  writes to the #grid element. No global state reads.
// ============================================================

import { TYPES, GRID_COLUMNS, MAX_LEVEL, VIEWS } from "./config.js";
import { getCurrentUser } from "./auth.js";
import { setGameLevel, fetchCardOccurrences } from "./db.js";

const grid = document.getElementById("grid");
const params = new URLSearchParams(window.location.search);
const gameId = params.get("game");

// ── Shared element builders ──────────────────────────────────

function backButton(label, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn btn-back";
  btn.innerHTML = `<div class="level">${label}</div>`;
  btn.onclick = onClick;
  return btn;
}

function titleBlock(html) {
  const div = document.createElement("div");
  div.className = "grid-title";
  div.innerHTML = `<h2>${html}</h2>`;
  return div;
}

// Navigates to quiz or multiplayer depending on URL params.
async function goToQuiz(levelKey) {
  if (gameId) {
    await setGameLevel(gameId, levelKey);
    window.location.href = `multiplayer/multiplayer.html?game=${gameId}`;
  } else {
    window.location.href = `quiz/quiz.html?level=${levelKey}`;
  }
}

// ── isLevelDone ───────────────────────────────────────────────
// Returns true when all exercises for a given level are completed.
function isLevelDone(userData, type, level) {
  return type.exercises.every(ex => {
    const key = `${level}-${ex.index}`;
    return userData?.levels?.[key]?.length > 0;
  });
}

// ── Views ─────────────────────────────────────────────────────

export function renderMainSelect(navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  const cards = [
    {
      cls: "btn btn-large wanikani",
      icon: "📖",
      label: "WaniKani",
      title: "Levels",
      sub: "Radical · Kanji · Vocabulary",
      onClick: () => navigate(VIEWS.TYPE),
    },
    {
      cls: "btn btn-large review",
      icon: "🔁",
      label: "SRS",
      title: "Reviews",
      sub: "Cards due today",
      onClick: () => { window.location.href = "quiz/quiz.html?reviews=true"; },
    },
    {
      cls: "btn btn-large own",
      icon: "🎵",
      label: "Personal",
      title: "My Texts",
      sub: "Lyrics, articles, readings…",
      onClick: () => navigate(VIEWS.OWN),
    },
    {
      cls: "btn btn-large kanji",
      icon: "📊",
      label: "Progress",
      title: "My progression",
      sub: "Kanji · Vocabulaire",
      onClick: () => navigate(VIEWS.PROGRESS),
    },
  ];

  for (const c of cards) {
    const btn = document.createElement("button");
    btn.className = c.cls;
    btn.innerHTML = `
      <div class="card-icon">${c.icon}</div>
      <div class="card-body">
        <div class="card-label">${c.label}</div>
        <div class="card-title">${c.title}</div>
        <div class="card-sub">${c.sub}</div>
      </div>
      <div class="card-arrow">›</div>
    `;
    btn.onclick = c.onClick;
    grid.appendChild(btn);
  }
}

export function renderTypeSelect(userData, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));

  for (const [typeKey, type] of Object.entries(TYPES)) {
    const completed = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)
      .filter(lvl => isLevelDone(userData, type, lvl)).length;

    const btn = document.createElement("button");
    btn.className = `btn btn-large ${typeKey}`;
    btn.innerHTML = `
      <div class="card-icon">${type.icon}</div>
      <div class="card-body">
        <div class="card-label">${type.sublabel}</div>
        <div class="card-title">${type.label}</div>
        <div class="card-sub">${completed} / ${MAX_LEVEL} levels completed</div>
      </div>
      <div class="card-arrow">›</div>
    `;
    btn.onclick = () => navigate(VIEWS.LEVEL, { type: typeKey });
    grid.appendChild(btn);
  }
}

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
        goToQuiz(`${level}-${type.exercises[0].index}`);
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
    btn.onclick = () => goToQuiz(key);
    grid.appendChild(btn);
  }
}

export async function renderGridView(userData) {
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
      btn.onclick = () => goToQuiz(`${level}-${exerciseIndex}`);
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
  // APRÈS
  header.innerHTML = `
    <div class="grid-title" style="grid-column: unset; flex:1;"><h2>${ownPath.length === 0 ? "My Texts" : ownPath.at(-1)}</h2></div>
    <button class="btn-add-own" id="addOwnBtn">＋</button>
    <button class="btn-add-folder" id="addFolderBtn">📁</button>
  `;
  grid.appendChild(header);
  document.getElementById("addOwnBtn").addEventListener("click", onAddText);
  document.getElementById("addFolderBtn").addEventListener("click", onAddFolder);

  if (!getCurrentUser()) {
    grid.appendChild(emptyMessage("Please log in to see your texts."));
    return;
  }

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

  for (const title of keys) {
    const node = currentNode[title];
    const btn = document.createElement("button");

    if (node.type === "folder") {
      btn.className = "btn own-card own-card--folder";
      btn.innerHTML = `
        <div class="own-card-icon own-card-icon--folder">📁</div>
        <div class="own-card-body">
          <div class="own-card-title">${title}</div>
          <div class="own-card-meta">
            <span class="own-pill folder-pill">📁 ${Object.values(node.children || {}).filter(n => n.type === "folder").length} dossiers</span>
            <span class="own-pill vocab-pill">🎵 ${Object.values(node.children || {}).filter(n => n.type === "text").length} textes</span>
          </div>
        </div>
        <div class="own-card-arrow">›</div>
      `;
      btn.onclick = () => navigate(VIEWS.OWN, { ownPath: [...ownPath, title] });

    } else {
      const { vocabulary = [], kanji = [] } = node;
      btn.className = "btn own-card";
      btn.innerHTML = `
        <div class="own-card-icon">🎵</div>
        <div class="own-card-body">
          <div class="own-card-title">${title}</div>
          <div class="own-card-meta">
            <span class="own-pill vocab-pill">📖 ${vocabulary.length} vocab</span>
            <span class="own-pill kanji-pill">🈳 ${kanji.length} kanji</span>
          </div>
        </div>
        <div class="own-card-arrow">›</div>
      `;
      btn.onclick = () => navigate(VIEWS.OWN_DETAIL, { own: title, ownPath });
    }

    grid.appendChild(btn);
  }
}

export function renderOwnDetail(userData, { own, ownPath }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  grid.appendChild(backButton("← " + (ownPath.at(-1) ?? "My Texts"), () =>
    navigate(VIEWS.OWN, { ownPath })
  ));

  // Bouton étudier
  const studyBtn = document.createElement("button");
  studyBtn.className = "btn btn-back own-study-btn";
  studyBtn.innerHTML = `<div class="level">📚 Étudier ce texte</div>`;
  studyBtn.onclick = () => navigate(VIEWS.OWN_TYPE, { own, ownPath });
  grid.appendChild(studyBtn);

  const createBtn = document.createElement("button");
  createBtn.className = "btn btn-back own-study-btn";
  createBtn.innerHTML = `<div class="level">＋ Create a card</div>`;
  createBtn.onclick = () => navigate(VIEWS.WORD_EDIT, {
    wordId: null,
    own,
    ownPath,
    wordEditMode: "create",
  });
  grid.appendChild(createBtn);

  // Récupère les ids du texte
  let node = userData?.ownLevels || {};
  for (const key of ownPath) node = node[key]?.children || {};
  const { kanji = [], vocabulary = [] } = node[own] || {};
  console.log("ALL_SUBJECTS", window.ALL_SUBJECTS);
  console.log("kanji ids", kanji);
  console.log("vocab ids", vocabulary);

  // Section Kanji
  if (kanji.length) {
    const kanjiTitle = document.createElement("div");
    kanjiTitle.className = "own-detail-section-title";
    kanjiTitle.textContent = "Kanji";
    grid.appendChild(kanjiTitle);

    const kanjiGrid = document.createElement("div");
    kanjiGrid.className = "related-container own-detail-grid";
    kanji.forEach(id => {
      const item = getSubject(id, userData);
      if (!item) return;
      const v = document.createElement("div");
      v.className = "related-item kanji-item";
      v.innerHTML = `
        <div class="related-item-character">${item.characters}</div>
        <div class="related-item-meaning">${item.meanings[0]}</div>
        <div class="related-item-reading">${item.readings?.[0] ?? ""}</div>
      `;
      v.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath });
      kanjiGrid.appendChild(v);
    });
    grid.appendChild(kanjiGrid);
  }

  // Section Vocabulaire
  if (vocabulary.length) {
    const vocabTitle = document.createElement("div");
    vocabTitle.className = "own-detail-section-title";
    vocabTitle.textContent = "Vocabulaire";
    grid.appendChild(vocabTitle);

    const vocabGrid = document.createElement("div");
    vocabGrid.className = "related-container own-detail-grid";
    vocabulary.forEach(id => {
      const item = getSubject(id, userData);
      if (!item) return;
      const v = document.createElement("div");
      v.className = "related-item vocab-item";
      v.innerHTML = `
        <div class="related-item-character">${item.characters}</div>
        <div class="related-item-meaning">${item.meanings[0]}</div>
        <div class="related-item-reading">${item.readings?.[0] ?? ""}</div>
      `;
      v.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath });
      vocabGrid.appendChild(v);
    });
    grid.appendChild(vocabGrid);
  }
}

export function renderWordDetail({ wordId, own, ownPath, searchQuery, fromProgress, progressType, userData }, navigate, onKnown) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const item = getSubject(wordId, userData);
  const isKnown = userData?.cards?.[wordId]?.known === true;

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
  knownBtn.className = `btn own-study-btn ${isKnown ? "known-btn--active" : "known-btn--inactive"}`;
  knownBtn.innerHTML = `<div class="level">${isKnown ? "✅ Known" : "○ Mark as known"}</div>`;
  knownBtn.onclick = () => onKnown(wordId, isKnown);

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

  // ── 1. Carte principale (fond coloré + caractère) ──
  const cardEl = document.createElement("div");
  cardEl.className = isKanji ? "wd-card wd-card--kanji" : "wd-card wd-card--vocab";
  cardEl.innerHTML = `
    <div class="wd-kind">${isKanji ? "KANJI" : "VOCABULARY"}</div>
    <div class="wd-character">${item.characters}</div>
  `;
  grid.appendChild(cardEl);

  // ── 2. Answer box (fond blanc, sens + lecture) ──
  const answerEl = document.createElement("div");
  answerEl.className = isKanji ? "wd-answer wd-answer--kanji" : "wd-answer wd-answer--vocab";
  answerEl.innerHTML = `
    <div class="wd-main">${item.meanings.join(", ")}</div>
    <div class="wd-sub">${(item.readings ?? []).join(", ")}</div>
    ${item.part_of_speech ? `<div class="wd-pos">${item.part_of_speech}</div>` : ""}
  `;
  grid.appendChild(answerEl);

  // ── 3. Mnémonique ──
  //if (item.meaning_mnemonic) {
  //const mnemo = document.createElement("div");
  //mnemo.className = "wd-mnemonic";
  //mnemo.textContent = item.meaning_mnemonic;
  //grid.appendChild(mnemo);
  //}

  // ── 6. Occurrences ──
  // ── Conteneur occurrences (placeholder) ──
  const occBox = document.createElement("div");
  occBox.className = "wd-occurrences";
  grid.appendChild(occBox); // ← ajouté tout de suite à la bonne place

  const username = getCurrentUser();
  if (username) {
    fetchCardOccurrences(username, wordId).then(occurrences => {
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
  }

  // ── 5. Pastilles liées ──
  // ── 5a. Radicaux composants (kanji seulement) ──
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
      const v = document.createElement("div");
      v.className = "related-item radical-item";
      v.innerHTML = `
        <div class="related-item-character">${rad.characters}</div>
        <div class="related-item-meaning">${rad.meanings[0]}</div>
      `;
      v.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath });
      radBox.appendChild(v);
    });

    grid.appendChild(radBox);
  }

  // ── 5b. Pastilles liées ──

  const relatedIds = isKanji ? (item.kanji_to_vocab ?? []) : (item.kanji_from_vocab ?? []);
  console.log(item.kanji_to_vocab, item.kanji_from_vocab);
  if (relatedIds.length) {
    const relBox = document.createElement("div");
    relBox.className = "wd-related";
    relatedIds.forEach(id => {
      const rel = getSubject(id, userData);
      if (!rel) return;
      const v = document.createElement("div");
      v.className = `related-item ${isKanji ? "vocab-item" : "kanji-item"}`;
      v.innerHTML = `
        <div class="related-item-character">${rel.characters}</div>
        <div class="related-item-meaning">${rel.meanings[0]}</div>
        <div class="related-item-reading">${rel.readings?.[0] ?? ""}</div>
      `;
      v.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId: id, own, ownPath });
      relBox.appendChild(v);
    });
    grid.appendChild(relBox);
  }


  // ── 4. Exemples ──
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


export function renderOwnType(userData, { own }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-list";

  grid.appendChild(backButton("← Own", () => navigate(VIEWS.OWN)));

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

      // Radical → quiz direct
      if (type.exercises.length === 1) {
        const index = type.exercises[0].index;
        window.location.href =
          `quiz/quiz.html?own=${encodeURIComponent(own)}-${index}`;
      }

      // Kanji/Vocab → choix exercice
      else {
        navigate(VIEWS.OWN_EXERCISE, {
          own,
          type: typeKey
        });
      }
    };

    grid.appendChild(btn);
  }
}

export function renderOwnExercise(userData, { own, type: typeKey }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-exercise-select";

  const type = TYPES[typeKey];

  grid.appendChild(
    backButton("← Types", () =>
      navigate(VIEWS.OWN_TYPE, { own })
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
      window.location.href = `quiz/quiz.html?own=${key}`;
    };

    grid.appendChild(btn);
  }
}
function emptyMessage(text) {
  const p = document.createElement("p");
  p.className = "own-empty";
  p.textContent = text;
  return p;
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
    grid.appendChild(emptyMessage("Aucun résultat"));
    return;
  }

  const pillsContainer = document.createElement("div");
  pillsContainer.className = "search-results-grid";
  grid.appendChild(pillsContainer);

  results.forEach(item => {
    const v = document.createElement("div");
    if (item.object === "kanji") { v.className = "related-item kanji-item search-result-pill"; }
    if (item.object === "vocabulary") { v.className = "related-item vocab-item search-result-pill"; }
    v.innerHTML = `<div class="related-item-character">${item.characters}</div>`;
    console.log("Search result", item);
    v.onclick = async () => {
      const username = getCurrentUser();
      const occs = username ? await fetchCardOccurrences(username, item.id) : [];
      navigate(VIEWS.WORD_OCCURRENCES, {
        wordId: item.id,
        wordOccurrences: occs,
        own: null,
        ownPath: [],
        searchQuery: query,
      });
    };
    pillsContainer.appendChild(v);
  });
}


export function renderWordOccurrences({ wordId, wordOccurrences, own, ownPath, searchQuery, userData }, navigate) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const item = getSubject(wordId, userData);

  grid.appendChild(backButton("← Recherche", () =>
    navigate(VIEWS.SEARCH, { searchQuery })
  ));

  // Caractère en gros sans info
  const charEl = document.createElement("div");
  charEl.className = "wd-occurrences-character";
  charEl.textContent = item?.characters ?? wordId;
  grid.appendChild(charEl);

  // Bouton show card
  const showBtn = document.createElement("button");
  showBtn.className = "btn own-study-btn";
  showBtn.innerHTML = `<div class="level">📖 Show card</div>`;
  showBtn.onclick = () => navigate(VIEWS.WORD_DETAIL, { wordId, own, ownPath, searchQuery });
  grid.appendChild(showBtn);

  // Phrases
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



export function renderProgress(userData, progressType = "kanji", navigate, onMarkKnown) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));

  // Toggle kanji / vocab
  const toggle = document.createElement("div");
  toggle.className = "progress-toggle";
  toggle.innerHTML = `
    <button class="progress-toggle-btn ${progressType === "kanji" ? "active" : ""}" id="toggleKanji">Kanji</button>
    <button class="progress-toggle-btn ${progressType === "vocab" ? "active" : ""}" id="toggleVocab">Vocab</button>
  `;
  grid.appendChild(toggle);
  toggle.querySelector("#toggleKanji").onclick = () => navigate(VIEWS.PROGRESS, { progressType: "kanji" });
  toggle.querySelector("#toggleVocab").onclick = () => navigate(VIEWS.PROGRESS, { progressType: "vocab" });

  // Select mode state
  let selectMode = false;
  const selected = new Set();

  // Select mode toggle button
  const selectBtn = document.createElement("button");
  selectBtn.className = "btn progress-select-btn";
  selectBtn.textContent = "Select";
  grid.appendChild(selectBtn);

  // Sticky confirm button (hidden by default)
  const confirmBar = document.createElement("div");
  confirmBar.className = "progress-confirm-bar hidden";
  confirmBar.innerHTML = `<button class="btn progress-confirm-btn" id="confirmKnownBtn">✓ Mark as known (0)</button>`;
  document.body.appendChild(confirmBar);

  function updateConfirmBar() {
    confirmBar.querySelector("#confirmKnownBtn").textContent = `✓ Mark as known (${selected.size})`;
  }

  selectBtn.onclick = () => {
    selectMode = !selectMode;
    selected.clear();
    selectBtn.textContent = selectMode ? "Cancel" : "Select";
    selectBtn.classList.toggle("progress-select-btn--active", selectMode);
    confirmBar.classList.toggle("hidden", !selectMode);
    updateConfirmBar();
    document.querySelectorAll(".progress-pill").forEach(pill => {
      pill.classList.remove("progress-pill--selected");
    });
  };

  confirmBar.querySelector("#confirmKnownBtn").onclick = async () => {
    if (!selected.size) return;
    await onMarkKnown([...selected]);
    confirmBar.classList.add("hidden");
    document.body.removeChild(confirmBar);
  };

  // Items
  const allItems = Object.values(window.ALL_SUBJECTS || {})
    .filter(item => progressType === "kanji"
      ? item.object === "kanji"
      : item.object === "vocabulary" || item.object === "kana_vocabulary"
    )
    .sort((a, b) => (a.level ?? 99) - (b.level ?? 99));

  const byLevel = {};
  for (const item of allItems) {
    const lvl = item.level ?? 0;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(item);
  }

  for (const [level, items] of Object.entries(byLevel)) {
    const lvlTitle = document.createElement("div");
    lvlTitle.className = "progress-level-title";
    lvlTitle.textContent = `Level ${level}`;
    grid.appendChild(lvlTitle);

    const pillsGrid = document.createElement("div");
    pillsGrid.className = "progress-pills-grid";

    items.forEach(item => {
      const pill = document.createElement("div");
      const inProgress = userData?.cards?.[item.id] !== undefined;
      const known = userData?.cards?.[item.id]?.known === true;
      const statusClass = known ? "progress-pill--known" : inProgress ? "progress-pill--inprogress" : "";
      pill.className = `progress-pill ${progressType === "kanji" ? "progress-pill--kanji" : "progress-pill--vocab"} ${statusClass}`;
      pill.dataset.id = item.id;
      pill.innerHTML = `
        <div class="progress-pill-char">${item.characters}</div>
        <div class="progress-pill-reading">${item.readings?.[0] ?? ""}</div>
        <div class="progress-pill-meaning">${item.meanings?.[0] ?? ""}</div>
      `;

      pill.onclick = () => {
        if (selectMode) {
          if (selected.has(item.id)) {
            selected.delete(item.id);
            pill.classList.remove("progress-pill--selected");
          } else {
            selected.add(item.id);
            pill.classList.add("progress-pill--selected");
          }
          updateConfirmBar();
        } else {
          navigate(VIEWS.WORD_DETAIL, {
            wordId: item.id,
            own: null,
            ownPath: [],
            searchQuery: "",
            fromProgress: true,
            progressType,
          });
        }
      };

      pillsGrid.appendChild(pill);
    });

    grid.appendChild(pillsGrid);
  }
}


export function renderWordEdit({ wordId, own, ownPath, mode, userData }, navigate, onSave) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  const isEdit = mode === "edit";
  const base = isEdit ? (window.ALL_SUBJECTS?.[wordId] ?? window.CUSTOM_SUBJECTS?.[wordId]) : null;
  const overrides = isEdit ? (userData?.overrides?.[String(wordId)] ?? {}) : {};
  const current = base ? { ...base, ...overrides } : {};

  // État local du formulaire
  const form = {
    characters: current.characters ?? "",
    object: current.object ?? "vocabulary",
    readings: current.readings ?? [],
    meanings: current.meanings ?? [],
    examples: current.examples ?? [{ ja: "", en: "" }],
    components: current.radical_from_kanji ?? current.kanji_from_vocab ?? [],
  };

  // ── Back ──
  grid.appendChild(backButton(
    isEdit ? "← Card" : "← Back",
    () => isEdit
      ? navigate(VIEWS.WORD_DETAIL, { wordId, own, ownPath })
      : navigate(VIEWS.OWN_DETAIL, { own, ownPath })
  ));

  // ── Carte du haut ──
  const cardEl = document.createElement("div");
  cardEl.className = `wd-card wd-card--${form.object === "kanji" ? "kanji" : "vocab"} wd-card--edit`;
  cardEl.innerHTML = `
    <div class="wd-edit-row">
      <select class="wd-edit-select" id="editType">
        <option value="vocabulary" ${form.object === "vocabulary" ? "selected" : ""}>Vocabulary</option>
        <option value="kanji"      ${form.object === "kanji"      ? "selected" : ""}>Kanji</option>
        <option value="radical"    ${form.object === "radical"    ? "selected" : ""}>Radical</option>
      </select>
    </div>
    <input class="wd-edit-character" id="editCharacter"
      placeholder="字" value="${form.characters}" ${isEdit ? "readonly" : ""} />
  `;
  grid.appendChild(cardEl);

  // Met à jour la couleur de la carte quand on change le type
  cardEl.querySelector("#editType").onchange = (e) => {
    form.object = e.target.value;
    cardEl.className = `wd-card wd-card--${form.object === "kanji" ? "kanji" : "vocab"} wd-card--edit`;
  };

  // ── Answer box ──
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

  // ── Exemple ──
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

  // ── Composants (radicaux ou kanji) ──
  const compSection = document.createElement("div");
  compSection.className = "wd-edit-components";

  const compTitle = document.createElement("div");
  compTitle.className = "wd-edit-label wd-edit-label--section";
  compTitle.textContent = "Components";
  compSection.appendChild(compTitle);

  // Pastilles sélectionnées
  const selectedPills = document.createElement("div");
  selectedPills.className = "wd-related";
  compSection.appendChild(selectedPills);

  function renderSelectedComponents() {
    selectedPills.innerHTML = "";
    form.components.forEach(id => {
      const rel = window.ALL_SUBJECTS?.[id] ?? window.CUSTOM_SUBJECTS?.[id];
      if (!rel) return;
      const v = document.createElement("div");
      v.className = `related-item ${rel.object === "radical" ? "radical-item" : "kanji-item"}`;
      v.innerHTML = `
        <div class="related-item-character">${rel.characters}</div>
        <div class="related-item-meaning">${rel.meanings[0]}</div>
        <div class="wd-edit-remove">✕</div>
      `;
      v.querySelector(".wd-edit-remove").onclick = (e) => {
        e.stopPropagation();
        form.components = form.components.filter(c => c !== id);
        renderSelectedComponents();
      };
      selectedPills.appendChild(v);
    });
  }
  renderSelectedComponents();

  // Barre de recherche pour composants
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

  // ── Erreur ──
  const errorEl = document.createElement("div");
  errorEl.className = "wd-edit-error hidden";
  grid.appendChild(errorEl);

  // ── Save button ──
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn own-study-btn";
  saveBtn.innerHTML = `<div class="level">${isEdit ? "💾 Save changes" : "✅ Create card"}</div>`;
  saveBtn.onclick = () => {
    // Lecture des valeurs
    form.characters = grid.querySelector("#editCharacter").value.trim();
    form.object     = grid.querySelector("#editType").value;
    form.meanings   = grid.querySelector("#editMeanings").value.split(",").map(s => s.trim()).filter(Boolean);
    form.readings   = grid.querySelector("#editReadings").value.split(",").map(s => s.trim()).filter(Boolean);
    form.examples   = [{
      ja: grid.querySelector("#editExJa").value.trim(),
      en: grid.querySelector("#editExEn").value.trim(),
    }];

    // Validation
    if (!isEdit) {
      const missing = [];
      if (!form.characters)        missing.push("character");
      if (!form.meanings.length)   missing.push("meaning");
      if (!form.readings.length)   missing.push("reading");
      if (!form.examples[0].ja)    missing.push("Japanese example");
      if (!form.examples[0].en)    missing.push("English example");
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
          ...(form.meanings.length  ? { meanings:  form.meanings  } : {}),
          ...(form.readings.length  ? { readings:  form.readings  } : {}),
          ...(form.examples[0].ja   ? { examples:  form.examples  } : {}),
        }
      : {
          characters: form.characters,
          object:     form.object,
          meanings:   form.meanings,
          readings:   form.readings,
          examples:   form.examples,
          [form.object === "vocabulary" ? "kanji_from_vocab" : "radical_from_kanji"]: form.components,
        };

    onSave(mode, wordId, data);
  };
  grid.appendChild(saveBtn);
}

function getSubject(id, userData) {
  const base = window.ALL_SUBJECTS[id] ?? window.CUSTOM_SUBJECTS[id];
  const override = userData?.overrides?.[id];
  return override ? { ...base, ...override } : base;
}

