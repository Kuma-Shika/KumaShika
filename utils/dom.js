// utils/dom.js

export function el(tag, { className, innerHTML, onclick, id } = {}) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (innerHTML) e.innerHTML = innerHTML;
    if (onclick) e.onclick = onclick;
    if (id) e.id = id;
    return e;
}

export function backButton(label, onClick) {
    return el("button", {
        className: "btn btn-back",
        innerHTML: `<div class="level">${label}</div>`,
        onclick: onClick,
    });
}

export function titleBlock(html) {
    return el("div", {
        className: "grid-title",
        innerHTML: `<h2>${html}</h2>`,
    });
}

export function cardButton({ cls, icon, label, title, sub, onClick }) {
    return el("button", {
        className: cls,
        innerHTML: `
      <div class="card-icon">${icon}</div>
      <div class="card-body">
        <div class="card-label">${label}</div>
        <div class="card-title">${title}</div>
        <div class="card-sub">${sub}</div>
      </div>
      <div class="card-arrow">›</div>
    `,
        onclick: onClick,
    });
}

export function clearGrid(grid, className = "") {
    grid.innerHTML = "";
    grid.className = `grid ${className}`.trim();
}

export function emptyMessage(text) {
    return el("div", { className: "empty-message", innerHTML: text });
}