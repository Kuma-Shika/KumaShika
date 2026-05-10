// components/levelHeader.js
export function levelHeader(key, sort, onStudy) {
  const div = document.createElement("div");
  div.className = "progress-level-header";

  const title = document.createElement("div");
  title.className = "progress-level-title";
  title.textContent = sort === "jlpt" ? `JLPT ${key}` : `Level ${key}`;
  div.appendChild(title);

  const btn = document.createElement("button");
  btn.className = "btn progress-jlpt-study-btn";
  btn.textContent = "Study";
  btn.onclick = onStudy;
  div.appendChild(btn);

  return div;
}