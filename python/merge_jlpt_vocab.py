"""
merge_jlpt_vocab.py
────────────────────
Ajoute les entrées de data/jlpt_vocab.json
dans data/all_subjects_simplified.json.
"""

import json

SUBJECTS_PATH = "data/all_subjects_simplified.json"
JLPT_PATH     = "data/jlpt_vocab.json"

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

def main():
    subjects = load_json(SUBJECTS_PATH)
    jlpt     = load_json(JLPT_PATH)

    before = len(subjects)
    subjects.update(jlpt)

    print(f"✅ {before} sujets avant")
    print(f"✅ {len(jlpt)} mots JLPT ajoutés")
    print(f"✅ {len(subjects)} sujets au total")

    save_json(SUBJECTS_PATH, subjects)

main()