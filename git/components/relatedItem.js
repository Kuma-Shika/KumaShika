// components/relatedItem.js
import { isKnown } from "../utils/subject.js";

// Base — utilisée par toutes les variantes
function buildRelatedItem(typeClass, { character, meaning, reading, known }) {
    const v = document.createElement("div");
    const knownClass = known ? " progress-pill--known" : "";
    v.className = `related-item ${typeClass}${knownClass}`;
    v.innerHTML = `
    <div class="related-item-character">${character}</div>
    <div class="related-item-meaning">${meaning}</div>
    ${reading !== undefined ? `<div class="related-item-reading">${reading}</div>` : ""}
  `;
    return v;
}

// Kanji — character + meaning + reading + known status
export function kanjiItem(item, onClick) {
    const v = buildRelatedItem("kanji-item", {
        character: item.characters,
        meaning: item.meanings[0],
        reading: item.readings?.[0] ?? "",
        known: isKnown(item.id),
    });
    if (onClick) v.onclick = onClick;
    return v;
}

// Vocab — idem kanji
export function vocabItem(item, onClick) {
    const v = buildRelatedItem("vocab-item", {
        character: item.characters,
        meaning: item.meanings[0],
        reading: item.readings?.[0] ?? "",
        known: isKnown(item.id),
    });
    if (onClick) v.onclick = onClick;
    return v;
}

// Radical — sans reading
export function radicalItem(item, onClick) {
    const v = buildRelatedItem("radical-item", {
        character: item.characters,
        meaning: item.meanings[0],
        known: false,
    });
    if (onClick) v.onclick = onClick;
    return v;
}

// Search result — juste le caractère, pas de meaning ni reading
export function searchItem(item, onClick) {
    const v = document.createElement("div");
    const typeClass = item.object === "kanji" ? "kanji-item" : "vocab-item";
    v.className = `related-item ${typeClass} search-result-pill`;
    v.innerHTML = `<div class="related-item-character">${item.characters}</div>`;
    if (onClick) v.onclick = onClick;
    return v;
}

// Variante éditable — avec bouton ✕ (pour renderWordEdit)
export function editableItem(item, typeClass, onRemove) {
    const v = buildRelatedItem(typeClass, {
        character: item.characters,
        meaning: item.meanings[0],
        known: false,
    });
    const removeBtn = document.createElement("div");
    removeBtn.className = "wd-edit-remove";
    removeBtn.textContent = "✕";
    removeBtn.onclick = (e) => { e.stopPropagation(); onRemove(); };
    v.appendChild(removeBtn);
    return v;
}