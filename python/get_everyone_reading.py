#read all_subjects_simplified.json, and if the subject doesn't have a reading, then the "characters" is also the reading and add a "reading" field with the same value as "characters". Then save the modified data to a new file called all_subjects_with_readings.json.

"""
add_frequency_all.py
─────────────────────
Enrichit data/all_subjects_simplified.json avec les fréquences.
Même logique que add_frequency_jlpt.py.
"""

import os
import json

SUBJECTS_PATH = "data/all_subjects_simplified.json"
OUTPUT_PATH   = "data/all_subjects_with_readings.json"

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


def main():
    subjects = load_json(SUBJECTS_PATH)
    dico = {}
    for subject in subjects.values():
        if len(subject["readings"]) == 0:
            print(f"⚠️ Sujet sans lecture trouvé : {subject['id']} - {subject['characters']}")
            subject["readings"] = [subject["characters"]]
        dico[subject["id"]] = subject

    print(f"✅ {SUBJECTS_PATH} traité, {len(subjects)} sujets vérifiés")

    save_json(OUTPUT_PATH, dico)
    print(f"\n✅ {OUTPUT_PATH} mis à jour")

if __name__ == "__main__":
    main()