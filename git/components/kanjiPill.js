import { isKnown, inProgress } from "../utils/subject.js";
import { levelHeader } from "./levelHeader.js";
import { VIEWS } from "../index/config.js";
console.log("Loading progressPill.js");
// components/progressPill.js

// ── Base — juste l'affichage ──────────────────────────────────
// Crée la pill avec les infos de l'item, rien d'autre
export function createPill(item, typeClass) {
  const known = isKnown(item.id);
  const progress = inProgress(item.id);
  const status = known ? "progress-pill--known" : progress ? "progress-pill--inprogress" : "";

  const pill = document.createElement("div");
  pill.className = `progress-pill ${typeClass} ${status}`;
  pill.dataset.id = item.id;
  pill.innerHTML = `
    <div class="progress-pill-char">${item.characters}</div>
    <div class="progress-pill-reading">${item.readings?.[0] ?? ""}</div>
    <div class="progress-pill-meaning">${item.meanings?.[0] ?? ""}</div>
  `;

  // Méthodes de base exposées sur l'élément
  pill.select = () => pill.classList.add("progress-pill--selected");
  pill.deselect = () => pill.classList.remove("progress-pill--selected");
  pill.isSelected = () => pill.classList.contains("progress-pill--selected");

  return pill;
}

// ── Extensions — comportements spécifiques ────────────────────

// Dans Progress — sélectionnable ou navigable
export function progressPill(item, progressType, { onSelect, onNavigate }) {
  const typeClass = progressType === "kanji" ? "progress-pill--kanji" : "progress-pill--vocab";
  const pill = createPill(item, typeClass);

  pill.onclick = () => {
    if (onSelect) onSelect(pill, item.id);
    else onNavigate(item.id);
  };

  return pill;
}

// Dans Quiz / wordDetail — juste navigable, pas sélectionnable
export function relatedPill(item, typeClass, onClick) {
  const pill = createPill(item, typeClass);
  pill.onclick = onClick;
  return pill;
}

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1", "N0"];

export function pillsSection(allItems, progressType, { selected, bar, navigate }) {
  const container = document.createElement("div");

  function refresh(sort, hideKnown) {
    container.innerHTML = "";

    const sorted = [...allItems]
      .filter(item => !hideKnown || !isKnown(item.id))
      .sort((a, b) =>
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
      container.appendChild(
        levelHeader(key, sort, () => navigate(VIEWS.PROGRESS_EXERCISE, {
          studyMode: sort, studyLevelKey: key, progressType,
        }))
      );

      const pillsGrid = document.createElement("div");
      pillsGrid.className = "progress-pills-grid";
      items.forEach(item => {
        pillsGrid.appendChild(progressPill(item, progressType, {
          onSelect: (pill, id) => {
            if (selected.has(id)) { pill.deselect(); selected.delete(id); }
            else { pill.select(); selected.add(id); }
            bar.update();
          },
          onNavigate: (id) => navigate(VIEWS.WORD_DETAIL, {
            wordId: id, own: null, ownPath: [],
            searchQuery: "", fromProgress: true, progressType,
          }),
        }));
      });
      container.appendChild(pillsGrid);
    }
  }

  container.refresh = refresh;
  return container;
}