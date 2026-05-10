// components/selectButton.js
export function selectButton(selected, bar, onToggle) {
    const btn = document.createElement("button");
    btn.className = "btn progress-select-btn";
    btn.textContent = "Select";

    btn.onclick = () => {
        const active = btn.classList.toggle("progress-select-btn--active");
        selected.clear();
        btn.textContent = active ? "Cancel" : "Select";
        bar.classList.toggle("hidden", !active);
        bar.update();
        document.querySelectorAll(".progress-pill")
            .forEach(p => p.classList.remove("progress-pill--selected"));
        if (onToggle) onToggle(active);
    };

    return btn;
}