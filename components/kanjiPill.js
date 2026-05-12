import { isKnown, inProgress } from "../utils/subject.js";
import { levelHeader } from "./levelHeader.js";
import { VIEWS } from "../index/config.js";

const PILL_CONTEXTS = {
  PROGRESS: "progress",
  QUIZ: "quiz",
};

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1", "N0"];

// ── Base ──────────────────────────────────────────────────────

export function createPill(item, typeClass, context = PILL_CONTEXTS.PROGRESS) {
  const known = isKnown(item.id);
  const progress = inProgress(item.id);
  const status = known ? "kanji-pill--known" :
    progress ? "kanji-pill--inprogress" : "";

  const pill = document.createElement("div");
  pill.className = `kanji-pill ${typeClass} ${status}`.trim();
  pill.dataset.id = item.id;

  const isVocab = typeClass === "kanji-pill--vocab";

  let metaHTML = "";
  if (context === PILL_CONTEXTS.PROGRESS && isVocab) {
    metaHTML = `<div class="kanji-pill-jlpt">${item.frequency ?? ""}</div>`;
  }
  if (context === PILL_CONTEXTS.QUIZ) {
    metaHTML = `<div class="kanji-pill-jlpt">${item.jlpt ?? ""}</div>`;
    if (isVocab) {
      metaHTML += `<div class="kanji-pill-jlpt">${item.frequency ?? ""}</div>`;
    }
  }

  pill.innerHTML = `
    <div class="kanji-pill-char">${item.characters}</div>
    <div class="kanji-pill-reading">${item.readings?.[0] ?? "&nbsp;"}</div>
    <div class="kanji-pill-meaning">${item.meanings?.[0] ?? "&nbsp;"}</div>
    ${metaHTML}
  `;

  pill.select = () => pill.classList.add("kanji-pill--selected");
  pill.deselect = () => pill.classList.remove("kanji-pill--selected");
  pill.isSelected = () => pill.classList.contains("kanji-pill--selected");

  return pill;
}

// ── Variantes par type ────────────────────────────────────────

export function radicalPill(item, onClick) {
  const pill = createPill(item, "kanji-pill--radical", PILL_CONTEXTS.PROGRESS);
  if (onClick) pill.onclick = onClick;
  return pill;
}

export function kanjiPill(item, onClick) {
  const pill = createPill(item, "kanji-pill--kanji", PILL_CONTEXTS.PROGRESS);
  if (onClick) pill.onclick = onClick;
  return pill;
}

export function vocabPill(item, onClick) {
  const pill = createPill(item, "kanji-pill--vocab", PILL_CONTEXTS.PROGRESS);
  if (onClick) pill.onclick = onClick;
  return pill;
}

export function radicalPillQuiz(item, onClick) {
  const pill = createPill(item, "kanji-pill--radical", PILL_CONTEXTS.QUIZ);
  if (onClick) pill.onclick = onClick;
  return pill;
}

export function kanjiPillQuiz(item, onClick) {
  const pill = createPill(item, "kanji-pill--kanji", PILL_CONTEXTS.QUIZ);
  if (onClick) pill.onclick = onClick;
  return pill;
}

export function vocabPillQuiz(item, onClick) {
  const pill = createPill(item, "kanji-pill--vocab", PILL_CONTEXTS.QUIZ);
  if (onClick) pill.onclick = onClick;
  return pill;
}



// ── Progress — sélectionnable ou navigable ────────────────────

export function progressPill(item, progressType, { onSelect, onNavigate }) {
  const pill = progressType === "kanji"
    ? kanjiPill(item)
    : vocabPill(item);

  pill.onclick = () => {
    if (onSelect) onSelect(pill, item.id);
    else onNavigate(item.id);
  };

  return pill;
}

// ── Section groupée pour la page Progress ─────────────────────

export function pillsSection(allItems, progressType, { selected, bar, navigate }) {
  const container = document.createElement("div");

  function refresh(sort, hideKnown) {
    container.innerHTML = "";

    const filtered = allItems.filter(item => !hideKnown || !isKnown(item.id));

    const sorted = [...filtered].sort((a, b) =>
      sort === "jlpt"
        ? JLPT_ORDER.indexOf(a.jlpt ?? "N0") - JLPT_ORDER.indexOf(b.jlpt ?? "N0")
        : (a.level ?? 99) - (b.level ?? 99)
    );

    const byGroup = {};
    for (const item of sorted) {
      const key = sort === "jlpt" ? (item.jlpt ?? "N0") : (item.level ?? 0);
      (byGroup[key] ??= []).push(item);
    }

    for (const [key, items] of Object.entries(byGroup)) {
      // Trier par fréquence croissante au sein de chaque groupe
      const groupItems = [...items].sort((a, b) => {
        if (a.frequency == null) return 1;
        if (b.frequency == null) return -1;
        return a.frequency - b.frequency;
      });

      container.appendChild(
        levelHeader(key, sort, () => navigate(VIEWS.PROGRESS_EXERCISE, {
          studyMode: sort,
          studyLevelKey: key,
          progressType,
        }))
      );

      const pillsGrid = document.createElement("div");
      pillsGrid.className = "progress-pills-grid";

      groupItems.forEach(item => {
        pillsGrid.appendChild(
          progressPill(item, progressType, {
            onSelect: (pill, id) => {
              if (selected.has(id)) { pill.deselect(); selected.delete(id); }
              else { pill.select(); selected.add(id); }
              bar.update();
            },
            onNavigate: (id) => navigate(VIEWS.WORD_DETAIL, {
              wordId: id,
              own: null,
              ownPath: [],
              searchQuery: "",
              fromProgress: true,
              progressType,
            }),
          })
        );
      });

      container.appendChild(pillsGrid);
    }
  }

  container.refresh = refresh;
  return container;
}

