// ============================================================
//  importLyrics.js  —  Import bulk *_lyrics.txt files
//  Uses File System Access API (showDirectoryPicker).
//  Creates an "オープニング" folder and saves each song.
// ============================================================

import { loadDictionary, analyzeLyrics } from "./analyzer.js";
import { saveOwnFolder, saveOwnText, fetchCurrentUser } from "./db.js";

const FOLDER_NAME = "オープニング";

// ── Progress overlay ──────────────────────────────────────────

function createProgressOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "importOverlay";
    overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; z-index: 9999; gap: 16px;
  `;

    const box = document.createElement("div");
    box.style.cssText = `
    background: var(--bg, #1a1a2e); border-radius: 16px;
    padding: 32px 40px; min-width: 320px; text-align: center;
    border: 1px solid rgba(255,255,255,0.1);
  `;

    const title = document.createElement("div");
    title.textContent = `🎵 Import ${FOLDER_NAME}`;
    title.style.cssText = "font-size: 1.2rem; font-weight: bold; margin-bottom: 16px; color: var(--text, #fff);";

    const status = document.createElement("div");
    status.id = "importStatus";
    status.style.cssText = "font-size: 0.9rem; color: var(--text-muted, #aaa); margin-bottom: 12px;";
    status.textContent = "Préparation…";

    const barWrap = document.createElement("div");
    barWrap.style.cssText = `
    width: 100%; height: 8px; background: rgba(255,255,255,0.1);
    border-radius: 4px; overflow: hidden;
  `;
    const bar = document.createElement("div");
    bar.id = "importBar";
    bar.style.cssText = `
    height: 100%; width: 0%; background: var(--accent, #6c63ff);
    border-radius: 4px; transition: width 0.3s ease;
  `;
    barWrap.appendChild(bar);

    const counter = document.createElement("div");
    counter.id = "importCounter";
    counter.style.cssText = "font-size: 0.8rem; color: var(--text-muted, #aaa); margin-top: 8px;";

    box.append(title, status, barWrap, counter);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    return {
        setStatus: (text) => { status.textContent = text; },
        setProgress: (done, total) => {
            bar.style.width = `${Math.round((done / total) * 100)}%`;
            counter.textContent = `${done} / ${total}`;
        },
        remove: () => overlay.remove(),
    };
}

// ── Main import function ──────────────────────────────────────

export async function importLyricsFolder(currentPath, onDone) {
    // 1. Pick the lyrics directory
    let dirHandle;
    try {
        dirHandle = await window.showDirectoryPicker({ mode: "read" });
    } catch {
        return; // user cancelled
    }

    // 2. Collect all *_lyrics.txt files
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === "file" && name.endsWith("_lyrics.txt")) {
            files.push({ name, handle });
        }
    }

    if (files.length === 0) {
        alert("Aucun fichier *_lyrics.txt trouvé dans ce dossier.");
        return;
    }

    // Sort alphabetically
    files.sort((a, b) => a.name.localeCompare(b.name));

    const ui = createProgressOverlay();

    try {
        // 3. Load dictionary once
        ui.setStatus("Chargement du dictionnaire…");
        await loadDictionary();

        // 4. Create the オープニング folder (ignore error if already exists)
        ui.setStatus(`Création du dossier ${FOLDER_NAME}…`);
        try {
            await saveOwnFolder(FOLDER_NAME, currentPath);
        } catch (e) {
            if (e.message !== "already_exists") throw e;
        }

        const targetPath = [...currentPath, FOLDER_NAME];

        // 5. Analyse & save each file
        let done = 0;
        ui.setProgress(0, files.length);

        for (const { name, handle } of files) {
            const title = name.replace(/_lyrics\.txt$/, "");
            ui.setStatus(`🎵 ${title}`);

            const file = await handle.getFile();
            const content = await file.text();

            const analysis = analyzeLyrics(content, title);
            await saveOwnText(title, analysis, content, targetPath);

            done++;
            ui.setProgress(done, files.length);
        }

        ui.setStatus(`✅ ${done} musiques importées !`);
        await new Promise(r => setTimeout(r, 1200)); // brief success flash

        // 6. Refresh caller
        const freshData = await fetchCurrentUser();
        onDone(freshData);

    } catch (err) {
        console.error("importLyricsFolder:", err);
        ui.setStatus(`❌ Erreur : ${err.message}`);
        await new Promise(r => setTimeout(r, 2500));
    } finally {
        ui.remove();
    }
}