"""
add_frequency_jlpt.py
──────────────────────
Enrichit data/jlpt_vocab.json avec les fréquences
depuis assets/term_meta_bank_1.json.

Met à jour jlpt_vocab.json sur place.
"""

import os
import json

# ── Chemins ───────────────────────────────────────────────────

FREQ_PATH   = "assets/term_meta_bank_1.json"
VOCAB_PATH  = "data/jlpt_vocab.json"


# ── I/O ───────────────────────────────────────────────────────

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


# ── Fréquences ────────────────────────────────────────────────

def build_freq_map(freq_list: list) -> dict[str, int]:
    freq_map = {}
    for entry in freq_list:
        if not isinstance(entry, list) or len(entry) < 3 or entry[1] != "freq":
            continue

        word    = entry[0]
        payload = entry[2]

        if isinstance(payload, int):
            freq = payload
        elif isinstance(payload, dict):
            freq = payload.get("frequency") or payload.get("value")
        else:
            continue

        if freq is None:
            continue

        if word not in freq_map or freq < freq_map[word]:
            freq_map[word] = freq

    return freq_map


SURU_SUFFIXES = ["する", "します", "して", "した", "しない", "できる", "すること"]

def lookup_frequency(freq_map: dict, character: str) -> int | None:
    if not character:
        return None

    # 1. Strip ～ en début de mot  →  ～する → する
    if character.startswith("～"):
        character = character[1:]

    # 2. Si plusieurs mots séparés par virgule, prendre le premier
    #    →  "行く、来る" ou "行く,来る" → "行く"
    if "、" in character:
        character = character.split("、")[0].strip()
    if "," in character:
        character = character.split(",")[0].strip()
    if ";" in character:
        character = character.split(";")[0].strip()

    if character in freq_map:
        return freq_map[character]

    for suffix in SURU_SUFFIXES:
        if character.endswith(suffix):
            base = character[:-len(suffix)]
            if base and base in freq_map:
                return freq_map[base]

    for prefix in ["お", "ご"]:
        if character.startswith(prefix):
            stripped = character[len(prefix):]
            if stripped and stripped in freq_map:
                return freq_map[stripped]

    return None


# ── Main ──────────────────────────────────────────────────────

def main():
    print("── Chargement ──")
    freq_list = load_json(FREQ_PATH)
    vocab     = load_json(VOCAB_PATH)
    print(f"✅ {len(vocab)} mots dans jlpt_vocab.json")

    print("── Construction de la freq map ──")
    freq_map = build_freq_map(freq_list)
    print(f"✅ {len(freq_map)} entrées dans la freq map")

    print("── Enrichissement ──")
    found     = 0
    not_found = []

    for subject in vocab.values():
        character = subject.get("characters")
        if not character:
            continue

        freq = lookup_frequency(freq_map, character)
        subject["frequency"] = freq

        if freq is not None:
            found += 1
        else:
            not_found.append(character)

    print(f"✅ {found} mots avec fréquence")
    print(f"❌ {len(not_found)} sans fréquence : {not_found[:20]}{'...' if len(not_found) > 20 else ''}")

    save_json(VOCAB_PATH, vocab)
    print(f"\n✅ {VOCAB_PATH} mis à jour")


if __name__ == "__main__":
    main()