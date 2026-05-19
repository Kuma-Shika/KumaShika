// views/quizSettings.js
import { VIEWS }                         from "../index/config.js";
import { clearGrid, backButton, titleBlock } from "../utils/dom.js";

const grid = document.getElementById("grid");

export function renderQuizSettings(quizParams, navigate, onBack) {
  clearGrid(grid, "grid-level-select");
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));

  grid.appendChild(backButton("← Back", onBack));
  grid.appendChild(titleBlock("Quiz Settings"));

  // ── Conteneur principal ───────────────────────────────────
  const card = document.createElement("div");
  card.className = "quiz-settings-card";

  // ── Length ───────────────────────────────────────────────
  const lengthBlock = document.createElement("div");
  lengthBlock.className = "quiz-settings-row";
  lengthBlock.innerHTML = `
    <label class="quiz-settings-label">Number of cards</label>
    <input
      type="number"
      id="quizLength"
      class="quiz-settings-input"
      min="1"
      max="500"
      placeholder="All"
    />
  `;
  card.appendChild(lengthBlock);

  // ── Include Known ────────────────────────────────────────
  const knownBlock = document.createElement("label");
  knownBlock.className = "quiz-settings-row quiz-settings-toggle-row";
  knownBlock.innerHTML = `
    <span class="quiz-settings-label">Include known cards</span>
    <input type="checkbox" id="includeKnown" checked />
    <div class="switch"></div>
  `;
  card.appendChild(knownBlock);

  // ── Order ────────────────────────────────────────────────
  const orderBlock = document.createElement("div");
  orderBlock.className = "quiz-settings-row";
  orderBlock.innerHTML = `
    <label class="quiz-settings-label">Order</label>
    <div class="quiz-settings-btn-group">
      <button class="quiz-settings-opt active" data-value="random">🔀 Random</button>
      <button class="quiz-settings-opt" data-value="difficulty">📈 Difficult first</button>
    </div>
  `;
  card.appendChild(orderBlock);

  let selectedOrder = "random";
  orderBlock.querySelectorAll(".quiz-settings-opt").forEach(btn => {
    btn.onclick = () => {
      orderBlock.querySelectorAll(".quiz-settings-opt").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedOrder = btn.dataset.value;
    };
  });

  grid.appendChild(card);

  // ── Start button ─────────────────────────────────────────
  const startBtn = document.createElement("button");
  startBtn.className = "btn btn-large wanikani quiz-settings-start";
  startBtn.innerHTML = `<div class="card-body"><div class="card-title">▶ Start Quiz</div></div>`;
  startBtn.onclick = () => {
    const rawLength    = document.getElementById("quizLength").value;
    const length       = rawLength ? parseInt(rawLength, 10) : null;
    const includeKnown = document.getElementById("includeKnown").checked;

    navigate(VIEWS.QUIZ, {
      quizParams: {
        ...quizParams,
        limit: length,
        includeKnown,
        order: selectedOrder,
      }
    });
  };

  grid.appendChild(startBtn);
}