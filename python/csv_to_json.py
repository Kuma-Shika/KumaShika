"""
import_jlpt_vocab.py
─────────────────────
Lit les fichiers JLPT_vocab/n5.csv → n1.csv et :

  1. Si le mot (characters) existe déjà dans all_subjects_simplified.json
     en tant que "vocabulary" → on met à jour son champ "jlpt"

  2. Si le mot n'existe pas → on crée une nouvelle entrée
     avec object, characters, readings, meanings, jlpt

Résultat :
  - data/all_subjects_simplified.json  mis à jour (jlpt enrichi sur WaniKani)
  - data/jlpt_vocab.json               nouveaux mots uniquement

IDs générés à partir de 10_000 (WaniKani s'arrête à 9387).
"""

import os
import csv
import json
from typing import Any

# ── Chemins ───────────────────────────────────────────────────

JLPT_DIR          = "JLPT_vocab"
SUBJECTS_PATH     = "data/all_subjects_simplified.json"
OUTPUT_SUBJECTS   = "data/all_subjects_simplified.json"   # écrasé sur place
OUTPUT_NEW_VOCAB  = "data/jlpt_vocab.json"
NEW_ID_START      = 10_000

LEVELS = ["n5", "n4", "n3", "n2", "n1"]


# ── I/O ───────────────────────────────────────────────────────

def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: str, content: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


# ── Lecture des CSV ───────────────────────────────────────────

def load_csv(path: str) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=",")
        for row in reader:
            rows.append(row)
    return rows


def parse_meanings(meaning_str: str) -> list[str]:
    return [m.strip().capitalize() for m in meaning_str.split(",") if m.strip()]


def parse_readings(reading_str: str) -> list[str]:
    return [r.strip() for r in reading_str.split(",") if r.strip()]


# ── Construction d'un nouveau sujet ──────────────────────────

def build_subject(row: dict, jlpt_level: str, new_id: int) -> dict:
    return {
        "id":               new_id,
        "object":           "vocabulary",
        "characters":       row["expression"].strip(),
        "meanings":         parse_meanings(row["meaning"]),
        "readings":         parse_readings(row["reading"]),
        "jlpt":             jlpt_level.upper(),
        "part_of_speech":   [],
        "examples":         [],
        "level":            None,
        "frequency":        None,
        "kanji_from_vocab": [],
        "source":           "jlpt",
    }


# ── Main ──────────────────────────────────────────────────────

def main():
    # 1. Charger all_subjects_simplified.json
    print("── Chargement des sujets WaniKani ──")
    subjects = load_json(SUBJECTS_PATH)

    # Index des vocabulary WaniKani : characters → clé du dict
    # On ne considère QUE les objets "vocabulary"
    vocab_index: dict[str, str] = {
        v["characters"]: k
        for k, v in subjects.items()
        if v.get("object") == "vocabulary" and v.get("characters")
    }

    print(f"✅ {len(vocab_index)} vocabulary WaniKani indexés")

    # 2. Lire chaque CSV
    print("\n── Lecture des CSV JLPT ──")

    new_vocab  = {}
    new_id     = NEW_ID_START
    seen       = set(vocab_index.keys())   # évite doublons entre niveaux

    stats = {"updated": 0, "added": 0, "skipped": 0}

    for level in LEVELS:
        path = os.path.join(JLPT_DIR, f"{level}.csv")

        if not os.path.exists(path):
            print(f"⚠️  {path} introuvable — ignoré")
            continue

        rows       = load_csv(path)
        jlpt_label = level.upper()
        level_updated = 0
        level_added   = 0

        for row in rows:
            characters = row.get("expression", "").strip()
            if not characters:
                continue

            # Doublon entre niveaux — déjà traité dans un niveau précédent
            if characters in seen and characters not in vocab_index:
                stats["skipped"] += 1
                continue

            # Cas 1 — mot déjà dans WaniKani vocabulary → enrichir jlpt
            if characters in vocab_index:
                key = vocab_index[characters]
                current_jlpt = subjects[key].get("jlpt")
                if current_jlpt is None or current_jlpt == "N0":
                    subjects[key]["jlpt"] = jlpt_label
                    stats["updated"] += 1
                    level_updated    += 1
                seen.add(characters)
                continue

            # Cas 2 — mot nouveau → créer l'entrée
            subject = build_subject(row, level, new_id)
            new_vocab[str(new_id)] = subject
            seen.add(characters)
            new_id         += 1
            stats["added"] += 1
            level_added    += 1

        print(f"  {jlpt_label} : {level_updated} WaniKani enrichis, {level_added} nouveaux mots")

    # 3. Sauvegarder
    print(f"\n── Résultat ──")
    print(f"✅ {stats['updated']} mots WaniKani enrichis avec leur niveau JLPT")
    print(f"✅ {stats['added']} nouveaux mots JLPT créés")
    print(f"⏭️  {stats['skipped']} doublons ignorés (même mot dans plusieurs niveaux)")

    print(f"\n── Sauvegarde ──")
    save_json(OUTPUT_SUBJECTS, subjects)
    print(f"✅ {OUTPUT_SUBJECTS} mis à jour ({len(subjects)} sujets)")

    save_json(OUTPUT_NEW_VOCAB, new_vocab)
    print(f"✅ {OUTPUT_NEW_VOCAB} sauvegardé ({len(new_vocab)} nouveaux mots)")


if __name__ == "__main__":
    main()