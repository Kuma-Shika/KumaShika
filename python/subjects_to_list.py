"""
to_list.py
───────────
Convertit data/all_subjects_simplified.json (dict)
en data/all_subjects_list.json (liste).
"""

import json

def main():
    with open("data/all_subjects_simplified.json", "r", encoding="utf-8") as f:
        subjects = json.load(f)

    result = list(subjects.values())

    with open("data/all_list.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(result)} sujets exportés dans all_list.json")

if __name__ == "__main__":
    main()