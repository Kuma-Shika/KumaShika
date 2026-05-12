// components/occurrencesBox.js

export function occurrencesBox(wordId, fetchCardOccurrences) {
    const box = document.createElement("div");
    box.className = "wd-occurrences";

    fetchCardOccurrences(wordId).then(occurrences => {
        if (!occurrences.length) return;

        const title = document.createElement("div");
        title.className = "wd-occurrences-title";
        title.textContent = "Vu dans";
        box.appendChild(title);

        occurrences.forEach(occ => {
            const item = document.createElement("div");
            item.className = "wd-occurrence-item";
            item.innerHTML = `
        <div class="wd-occurrence-source">🎵 ${occ.source}</div>
        <div class="wd-occurrence-sentence">${occ.sentence}</div>
      `;
            box.appendChild(item);
        });
    });

    return box;
}