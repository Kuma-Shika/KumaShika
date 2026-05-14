// components/ownCards.js

import { deleteOwnNode, renameOwnFolder, updateOwnText, fetchCurrentUser } from "../index/db.js";
import { loadDictionary, analyzeLyrics } from "../index/analyzer.js";


// ── Confirmation modal ────────────────────────────────────────
function showConfirm(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "modal show";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Confirmation</h3>
      <p style="color:#333;margin:12px 0">${message}</p>
      <div class="modal-actions">
        <button id="confirmYes">Delete</button>
        <button id="confirmNo">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#confirmYes").onclick = () => { document.body.removeChild(overlay); onConfirm(); };
  overlay.querySelector("#confirmNo").onclick = () => document.body.removeChild(overlay);
}

// ── Rename inline ─────────────────────────────────────────────
function showRenamePrompt(currentName, onRename) {
  const overlay = document.createElement("div");
  overlay.className = "modal show";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Rename folder</h3>
      <input id="renameInput" value="${currentName}" autocomplete="off" />
      <div class="modal-actions">
        <button id="renameSave">Save</button>
        <button id="renameCancel">Cancel</button>
      </div>
      <p id="renameMsg"></p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#renameInput").focus();
  overlay.querySelector("#renameCancel").onclick = () => document.body.removeChild(overlay);
  overlay.querySelector("#renameSave").onclick = () => {
    const newName = overlay.querySelector("#renameInput").value.trim();
    if (!newName) return;
    document.body.removeChild(overlay);
    onRename(newName);
  };
}

// ── Edit text modal ───────────────────────────────────────────
function showEditTextModal(currentText, onSave) {
  const overlay = document.createElement("div");
  overlay.className = "modal show";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Edit text</h3>
      <textarea id="editTextArea" rows="8" style="width:100%">${currentText}</textarea>
      <div class="modal-actions">
        <button id="editSave">Analyze & Save</button>
        <button id="editCancel">Cancel</button>
      </div>
      <p id="editMsg"></p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#editCancel").onclick = () => document.body.removeChild(overlay);
  overlay.querySelector("#editSave").onclick = async () => {
    const content = overlay.querySelector("#editTextArea").value.trim();
    if (!content) return;
    overlay.querySelector("#editMsg").textContent = "Analyzing...";
    await loadDictionary();
    document.body.removeChild(overlay);
    onSave(content);
  };
}

// ── Folder card ───────────────────────────────────────────────
export function folderCard(title, node, ownPath, { onClick, onDelete, onRename }) {
  const wrap = document.createElement("div");
  wrap.className = "own-card-wrap";

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

  const actions = document.createElement("div");
  actions.className = "own-card-actions";

  const renameBtn = document.createElement("button");
  renameBtn.className = "own-card-action-btn";
  renameBtn.textContent = "✏️";
  renameBtn.onclick = e => {
    e.stopPropagation();
    showRenamePrompt(title, onRename);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "own-card-action-btn own-card-action-btn--delete";
  deleteBtn.textContent = "🗑️";
  deleteBtn.onclick = e => {
    e.stopPropagation();
    showConfirm(`Delete folder "${title}" and all its contents?`, onDelete);
  };

  actions.appendChild(renameBtn);
  actions.appendChild(deleteBtn);
  wrap.appendChild(btn);
  wrap.appendChild(actions);
  return wrap;
}

// ── Text card ─────────────────────────────────────────────────
export function textCard(title, node, ownPath, { onClick, onDelete, onEdit }) {
  const wrap = document.createElement("div");
  wrap.className = "own-card-wrap";

  const btn = document.createElement("button");
  btn.className = "btn own-card";
  const { vocabulary = {}, kanji = {} } = node;
  const kanjiKeys = kanji ? kanji.split(",").filter(Boolean) : [];
  const vocabKeys = vocabulary ? vocabulary.split(",").filter(Boolean) : [];
  btn.innerHTML = `
    <div class="own-card-icon">🎵</div>
    <div class="own-card-body">
      <div class="own-card-title">${title}</div>
      <div class="own-card-meta">
        <span class="own-pill vocab-pill">📖 ${vocabKeys.length} vocab</span>
        <span class="own-pill kanji-pill">🈳 ${kanjiKeys.length} kanji</span>
      </div>
    </div>
    <div class="own-card-arrow">›</div>
  `;
  btn.onclick = onClick;

  const actions = document.createElement("div");
  actions.className = "own-card-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "own-card-action-btn";
  editBtn.textContent = "✏️";
  editBtn.onclick = e => {
    e.stopPropagation();
    showEditTextModal(node.rawText ?? "", onEdit);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "own-card-action-btn own-card-action-btn--delete";
  deleteBtn.textContent = "🗑️";
  deleteBtn.onclick = e => {
    e.stopPropagation();
    showConfirm(`Delete text "${title}"?`, onDelete);
  };

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  wrap.appendChild(btn);
  wrap.appendChild(actions);
  return wrap;
}

