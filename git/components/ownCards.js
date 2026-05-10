// components/ownCard.js
export function folderCard(title, node, onClick) {
    const btn = document.createElement("button");
    btn.className = "btn own-card own-card--folder";
    const folders = Object.values(node.children || {}).filter(n => n.type === "folder").length;
    const texts = Object.values(node.children || {}).filter(n => n.type === "text").length;
    btn.innerHTML = `
    <div class="own-card-icon own-card-icon--folder">📁</div>
    <div class="own-card-body">
      <div class="own-card-title">${title}</div>
      <div class="own-card-meta">
        <span class="own-pill folder-pill">📁 ${folders} dossiers</span>
        <span class="own-pill vocab-pill">🎵 ${texts} textes</span>
      </div>
    </div>
    <div class="own-card-arrow">›</div>
  `;
    btn.onclick = onClick;
    return btn;
}

export function textCard(title, node, onClick) {
    const btn = document.createElement("button");
    btn.className = "btn own-card";
    const { vocabulary = [], kanji = [] } = node;
    btn.innerHTML = `
    <div class="own-card-icon">🎵</div>
    <div class="own-card-body">
      <div class="own-card-title">${title}</div>
      <div class="own-card-meta">
        <span class="own-pill vocab-pill">📖 ${vocabulary.length} vocab</span>
        <span class="own-pill kanji-pill">🈳 ${kanji.length} kanji</span>
      </div>
    </div>
    <div class="own-card-arrow">›</div>
  `;
    btn.onclick = onClick;
    return btn;
}