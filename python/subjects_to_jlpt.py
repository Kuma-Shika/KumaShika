"""
generate_jlpt_ids.py
─────────────────────
Parcourt data/all_subjects_simplified.json et génère :
  id_per_jlpt/N5_kanji.json
  id_per_jlpt/N5_vocab.json
  ...jusqu'à N1
  id_per_jlpt/N0_kanji.json  ← ceux sans niveau JLPT
  id_per_jlpt/N0_vocab.json
"""

import os
import json

SUBJECTS_PATH = "../git/data/all_subjects_simplified.json"
OUTPUT_DIR    = "../git/id_per_jlpt"
LEVELS        = ["N5", "N4", "N3", "N2", "N1", "N0"]

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

def main():
    subjects = load_json(SUBJECTS_PATH)

    # Initialiser les groupes vides pour tous les niveaux
    groups = { level: { "kanji": [], "vocab": [] } for level in LEVELS }

    for subject in subjects.values():
        obj  = subject.get("object")
        sid  = subject.get("id")
        jlpt = subject.get("jlpt") or "N0"  # null → N0

        if not sid:
            continue

        # Normaliser au cas où la valeur serait en minuscule
        jlpt = jlpt.upper()
        if jlpt not in groups:
            jlpt = "N0"

        if obj == "kanji":
            groups[jlpt]["kanji"].append(sid)
        elif obj in ("vocabulary", "kana_vocabulary"):
            groups[jlpt]["vocab"].append(sid)
        # radicaux ignorés

    # Sauvegarder
    total = 0
    for level in LEVELS:
        for type_name, ids in groups[level].items():
            path = os.path.join(OUTPUT_DIR, f"{level}_{type_name}.json")
            save_json(path, ids)
            total += len(ids)
            print(f"✅ {path:<35} {len(ids):>5} ids")

    print(f"\n📦 {total} ids au total sur {len(subjects)} sujets")

if __name__ == "__main__":
    main()