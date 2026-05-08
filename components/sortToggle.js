// components/sortToggle.js
export function sortToggle(currentSort, onChange) {
    const div = document.createElement("div");
    div.className = "progress-toggle";

    const btns = [
        { id: "toggleJLPT", label: "JLPT", value: "jlpt" },
        { id: "toggleWK", label: "WK", value: "wk" },
    ];

    div.innerHTML = btns.map(b => `
        <button class="progress-toggle-btn ${currentSort === b.value ? "active" : ""}" id="${b.id}">
        ${b.label}
        </button>
    `).join("");

    btns.forEach(b => {
        div.querySelector(`#${b.id}`).onclick = () => {
            div.querySelectorAll(".progress-toggle-btn").forEach(btn => btn.classList.remove("active"));
            div.querySelector(`#${b.id}`).classList.add("active");
            onChange(b.value);
        };
    });

    return div;
}