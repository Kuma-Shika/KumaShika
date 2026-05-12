export function relatedBox(title, ids, getSubject, buildPill, onNavigate) {
    if (!ids?.length) return null;

    const box = document.createElement("div");
    box.className = "wd-related";

    const t = document.createElement("div");
    t.className = "wd-occurrences-title";
    t.textContent = title;
    box.appendChild(t);

    const pills = document.createElement("div");
    pills.className = "wd-related-pills";

    ids.forEach(id => {
        const item = getSubject(id);
        if (!item) return;
        pills.appendChild(buildPill(item, () => onNavigate(id)));
    });

    box.appendChild(pills);
    return box;
}