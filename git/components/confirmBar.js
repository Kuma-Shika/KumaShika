// components/confirmBar.js
export function confirmBar(selected, onMarkKnown) {
    const bar = document.createElement("div");
    bar.className = "progress-confirm-bar hidden";

    const btn = document.createElement("button");
    btn.className = "btn progress-confirm-btn";
    btn.textContent = "✓ Mark as known (0)";
    bar.appendChild(btn);

    // Méthode exposée pour mettre à jour le compteur
    bar.update = () => {
        btn.textContent = `✓ Mark as known (${selected.size})`;
    };

    btn.onclick = async () => {
        if (!selected.size) return;
        await onMarkKnown([...selected]);
        bar.classList.add("hidden");
    };

    return bar;
}