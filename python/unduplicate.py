"""
dedup_lists.py
──────────────
Supprime les doublons dans les listes kanji_to_vocab, radical_from_kanji,
radical_to_kanji et kanji_from_vocab de all_subjects_simplified.json.
"""

import json

SUBJECTS_PATH = "data/all_subjects_simplified.json"

FIELDS_TO_DEDUP = ["kanji_to_vocab", "radical_from_kanji", "radical_to_kanji", "kanji_from_vocab"]

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

def main():
    print("── Chargement ──")
    subjects = load_json(SUBJECTS_PATH)
    print(f"✅ {len(subjects)} sujets chargés")

    print("── Traitement ──")
    total = 0

    for subject in subjects.values():
        for field in FIELDS_TO_DEDUP:
            if field not in subject:
                continue
            before = subject[field]
            after = list(dict.fromkeys(before))  # dédup en préservant l'ordre
            if len(after) < len(before):
                subject[field] = after
                total += len(before) - len(after)

    print(f"✅ {total} doublons supprimés")

    save_json(SUBJECTS_PATH, subjects)
    print(f"✅ {SUBJECTS_PATH} mis à jour")

if __name__ == "__main__":
    main()