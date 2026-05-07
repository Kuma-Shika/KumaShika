export function sortToggle(currentSort, onChange) {
  const div = document.createElement("div");
  div.className = "progress-toggle";
  div.innerHTML = `
    <button class="progress-toggle-btn ${currentSort === "jlpt" ? "active" : ""}" data-sort="jlpt">JLPT</button>
    <button class="progress-toggle-btn ${currentSort === "wk"   ? "active" : ""}" data-sort="wk">WK</button>
  `;
  div.querySelectorAll(".progress-toggle-btn").forEach(btn => {
    btn.onclick = () => {
      div.querySelectorAll(".progress-toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(btn.dataset.sort);
    };
  });
  return div;
}