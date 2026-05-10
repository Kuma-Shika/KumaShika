// components/occurrenceItem.js
export function occurrenceItem(occ) {
    const div = document.createElement("div");
    div.className = "wd-occurrence-item";
    div.innerHTML = `
    <div class="wd-occurrence-source">🎵 ${occ.source}</div>
    <div class="wd-occurrence-sentence">${occ.sentence}</div>
  `;
    return div;
}