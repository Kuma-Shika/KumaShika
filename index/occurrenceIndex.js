// occurrenceIndex.js
// Construit { wordId → [{ source, sentence }] } depuis ownLevels au boot
// Format encodé : "id:sentIdx1-sentIdx2,id2:sentIdx3"
// Ancien format (fallback) : "id1,id2,id3"

import { splitSentences } from "./analyzer.js";

let index = null;

export function buildOccurrenceIndex(userData) {
    index = {};
    walkNode(userData?.ownLevels ?? {});
}

function processField(encoded, sentences, source) {
    if (!encoded) return;

    for (const entry of encoded.split(",").filter(Boolean)) {
        if (entry.includes(":")) {
            // ── Nouveau format : "id:0-2-5" ──────────────────────────
            const colonIdx = entry.indexOf(":");
            const id = entry.slice(0, colonIdx);
            const indices = entry.slice(colonIdx + 1).split("-").map(Number);

            if (!index[id]) index[id] = [];
            for (const idx of indices) {
                const sentence = sentences[idx];
                if (sentence) index[id].push({ source, sentence });
            }
        } else {
            // ── Ancien format : juste l'id, fallback scan ─────────────
            const id = entry;
            const item = window.ALL_SUBJECTS?.[id];
            const char = item?.characters;
            if (!char) continue;

            if (!index[id]) index[id] = [];
            for (const sentence of sentences) {
                if (sentence.includes(char)) {
                    index[id].push({ source, sentence });
                }
            }
        }
    }
}

function walkNode(node) {
    for (const [key, child] of Object.entries(node)) {
        if (child.type === "folder") {
            walkNode(child.children ?? {});
        } else if (child.type === "text" && child.rawText) {
            const source = key;
            const sentences = splitSentences(child.rawText);
            processField(child.vocabulary, sentences, source);
            processField(child.kanji, sentences, source);
        }
    }
}

export function getOccurrences(wordId) {
    return index?.[String(wordId)] ?? [];
}