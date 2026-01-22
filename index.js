const types = [
  { key: "radical", label: "Radical" },
  { key: "kanji", label: "Kanji" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "all", label: "All" }
];

const lang = [
  { key: "jp-en", label: "JP → EN" },
  { key: "en-jp", label: "EN → JP" }
]

const maxLevel = 60;
const grid = document.getElementById("grid");

const buttons = [
  ["radical", "Radical", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "meaning"],
  ["kanji", "Kanji", "jp-en", "JP → EN", "reading"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "meaning"],
  ["vocabulary", "Vocabulary", "jp-en", "JP → EN", "reading"],
  ["kanji", "Kanji", "en-jp", "EN → JP", "reading"],
  ["vocabulary", "Vocabulary", "en-jp", "EN → JP", "reading"],
];

for (let level = 1; level <= maxLevel; level++) {
  for (const [typeKey, typeLabel, modeKey, modeLabel, exerciseKey] of buttons) {
    const btn = document.createElement("button");
    btn.className = `btn ${typeKey}`;
    btn.innerHTML = `
      <div class="type">${typeLabel}</div>
      <div class="level">Level ${level}</div>
    `;

    btn.onclick = () => {
      window.location.href =
    `quiz/quiz.html?type=${typeKey}&level=${level}&mode=${modeKey}&ex=${exerciseKey}`;
    };

    grid.appendChild(btn);
  }
}