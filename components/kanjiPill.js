import { isKnown, inProgress } from "../utils/subject.js";
// components/progressPill.js

// ── Base — juste l'affichage ──────────────────────────────────
// Crée la pill avec les infos de l'item, rien d'autre
export function createPill(item, typeClass) {
  const known    = isKnown(item.id);
  const progress = inProgress(item.id);
  const status   = known ? "progress-pill--known" : progress ? "progress-pill--inprogress" : "";

  const pill = document.createElement("div");
  pill.className  = `progress-pill ${typeClass} ${status}`;
  pill.dataset.id = item.id;
  pill.innerHTML  = `
    <div class="progress-pill-char">${item.characters}</div>
    <div class="progress-pill-reading">${item.readings?.[0] ?? ""}</div>
    <div class="progress-pill-meaning">${item.meanings?.[0] ?? ""}</div>
  `;

  // Méthodes de base exposées sur l'élément
  pill.select     = () => pill.classList.add("progress-pill--selected");
  pill.deselect   = () => pill.classList.remove("progress-pill--selected");
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
    else          onNavigate(item.id);
  };

  return pill;
}

// Dans Quiz / wordDetail — juste navigable, pas sélectionnable
export function relatedPill(item, typeClass, onClick) {
  const pill = createPill(item, typeClass);
  pill.onclick = onClick;
  return pill;
}