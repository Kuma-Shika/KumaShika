"""
add_kanji_from_vocab.py
────────────────────────
Pour chaque mot de vocabulaire dans all_subjects_simplified.json,
parcourt ses characters, trouve les kanji via kanji_to_id.json,
et écrit le champ "kanji_from_vocab" avec la liste des ids kanji.

Exemple :
  characters: "日本語"
  kanji_to_id: { "日": [476], "本": [510], "語": [793] }
  → kanji_from_vocab: [476, 510, 793]
"""

import json
import re

SUBJECTS_PATH   = "data/all_subjects_simplified.json"
KANJI_TO_ID_PATH = "data/kanji_to_id.json"

# Regex pour détecter les caractères kanji
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
    updated    = 0
    not_found  = []

    for subject in subjects.values():
        if subject.get("object") not in ("vocabulary", "kana_vocabulary"):
            continue

        characters = subject.get("characters", "")
        if not characters:
            continue

        # Extraire les kanji uniques dans l'ordre d'apparition
        seen     = set()
        kanji_ids = []

        for char in characters:
            if KANJI_RE.match(char) and char not in seen:
                seen.add(char)
                ids = kanji_to_id.get(char)
                if ids:
                    kanji_ids.append(ids[0])  # prend le premier id si plusieurs
                else:
                    not_found.append(char)

        subject["kanji_from_vocab"] = kanji_ids
        subject["radical_from_kanji"] = kanji_ids
        if kanji_ids:
            updated += 1

    print(f"✅ {updated} mots de vocabulaire enrichis")
    print(f"⚠️  {len(set(not_found))} kanji non trouvés dans kanji_to_id : {sorted(set(not_found))[:20]}")

    save_json(SUBJECTS_PATH, subjects)
    print(f"✅ {SUBJECTS_PATH} mis à jour")

if __name__ == "__main__":
    main()