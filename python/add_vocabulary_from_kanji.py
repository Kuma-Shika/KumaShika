"""
Docstring for python.add_vocabulary_from_kanji

For each vocabulary subject, we look at its component kanji and add the
vocabulary id to each kanji's `kanji_to_vocab` list.
"""

import json
import re

SUBJECTS_PATH    = "data/all_subjects_simplified.json"
KANJI_TO_ID_PATH = "data/kanji_to_id.json"

KANJI_RE = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]')

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

def main():
    print("── Chargement ──")
    subjects    = load_json(SUBJECTS_PATH)
    kanji_to_id = load_json(KANJI_TO_ID_PATH)
    print(f"✅ {len(subjects)} sujets chargés")
    print(f"✅ {len(kanji_to_id)} kanji dans kanji_to_id")

    print("── Traitement ──")
    updated   = 0
    not_found = []

    for subject in subjects.values():
        if subject.get("object") not in ("vocabulary", "kana_vocabulary"):
            continue

        characters = subject.get("characters", "")
        if not characters:
            continue

        # Extraire les kanji uniques dans l'ordre d'apparition
        seen = set()

        for char in characters:
            if not KANJI_RE.match(char) or char in seen:
                continue
            seen.add(char)

            ids = kanji_to_id.get(char)
            if not ids:
                not_found.append(char)
                continue

            # Ajouter l'id du vocabulaire à chaque kanji correspondant
            for kanji_id in ids:
                print(f"🔗 Lier kanji {char} (id {kanji_id}) → vocab {subject['id']} ({characters})")
                subjects[str(kanji_id)]["kanji_to_vocab"].append(subject["id"])
                updated += 1

    print(f"✅ {updated} liaisons kanji→vocab ajoutées")
    print(f"⚠️  {len(set(not_found))} kanji non trouvés : {sorted(set(not_found))[:20]}")

    save_json(SUBJECTS_PATH, subjects)
    print(f"✅ {SUBJECTS_PATH} mis à jour")

if __name__ == "__main__":
    main()