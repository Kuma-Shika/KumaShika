// components/typeToggle.js
export function typeToggle(currentType, onChange) {
    const div = document.createElement("div");
    div.className = "progress-toggle";

    const btns = [
        { id: "toggleKanji", label: "Kanji", value: "kanji" },
        { id: "toggleVocab", label: "Vocab", value: "vocab" },
    ];

    div.innerHTML = btns.map(b => `
    <button class="progress-toggle-btn ${currentType === b.value ? "active" : ""}" id="${b.id}">
      ${b.label}
    </button>
  `).join("");

    btns.forEach(b => {
        div.querySelector(`#${b.id}`).onclick = () => onChange(b.value);
    });

    return div;
}