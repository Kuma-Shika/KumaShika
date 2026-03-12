// ============================================================
//  views.js  —  All render functions
//  Each function is pure: receives (state, navigate) and
//  writes to the #grid element. No global state reads.
// ============================================================

import { TYPES, GRID_COLUMNS, MAX_LEVEL, VIEWS } from "./config.js";
import { getCurrentUser }                         from "./auth.js";
import { setGameLevel }                           from "./db.js";

const grid   = document.getElementById("grid");
const params = new URLSearchParams(window.location.search);
const gameId = params.get("game");

// ── Shared element builders ──────────────────────────────────

function backButton(label, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn btn-back";
  btn.innerHTML = `<div class="level">${label}</div>`;
  btn.onclick   = onClick;
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
  grid.innerHTML  = "";
  grid.className  = "grid grid-list";

  const cards = [
    {
      cls:     "btn btn-large wanikani",
      icon:    "📖",
      label:   "WaniKani",
      title:   "Levels",
      sub:     "Radical · Kanji · Vocabulary",
      onClick: () => navigate(VIEWS.TYPE),
    },
    {
      cls:     "btn btn-large review",
      icon:    "🔁",
      label:   "SRS",
      title:   "Reviews",
      sub:     "Cards due today",
      onClick: () => { window.location.href = "quiz/quiz.html?reviews=true"; },
    },
    {
      cls:     "btn btn-large own",
      icon:    "🎵",
      label:   "Personal",
      title:   "My Texts",
      sub:     "Lyrics, articles, readings…",
      onClick: () => navigate(VIEWS.OWN),
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

export function renderOwnSelect(userData, navigate, onAddText) {
  grid.innerHTML = "";
  grid.className = "grid grid-level-select";

  grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));

  const header = document.createElement("div");
  header.className = "own-header";
  header.innerHTML = `
    <div class="grid-title" style="grid-column: unset; flex:1;"><h2>My Texts</h2></div>
    <button class="btn-add-own" id="addOwnBtn">＋</button>
  `;
  grid.appendChild(header);
  document.getElementById("addOwnBtn").addEventListener("click", onAddText);

  if (!getCurrentUser()) {
    grid.appendChild(emptyMessage("Please log in to see your texts."));
    return;
  }

  const ownLevels = userData?.ownLevels || {};
  const keys = Object.keys(ownLevels);

  if (keys.length === 0) {
    grid.appendChild(emptyMessage("No texts yet. Press ＋ to add one!"));
    return;
  }

  for (const title of keys) {
    const { vocab = [], kanji = [] } = ownLevels[title];
    const btn = document.createElement("button");
    btn.className = "btn own-card";
    btn.innerHTML = `
      <div class="own-card-icon">🎵</div>
      <div class="own-card-body">
        <div class="own-card-title">${title}</div>
        <div class="own-card-meta">
          <span class="own-pill vocab-pill">📖 ${vocab.length} vocab</span>
          <span class="own-pill kanji-pill">🈳 ${kanji.length} kanji</span>
        </div>
      </div>
      <div class="own-card-arrow">›</div>
    `;
    btn.onclick = () => {
      window.location.href = `quiz/quiz.html?own=${encodeURIComponent(title)}`;
    };
    grid.appendChild(btn);
  }
}

function emptyMessage(text) {
  const p = document.createElement("p");
  p.className   = "own-empty";
  p.textContent = text;
  return p;
}
