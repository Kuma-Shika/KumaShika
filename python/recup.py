import requests
import json
import time
import os

API_KEY = "0ac6ccb7-1090-4e63-abd6-cb372e0eb2b7"
BASE_URL = "https://api.wanikani.com/v2/subjects"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Wanikani-Revision": "20170710"
}

OUTPUT_DIR = "data"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def fetch_all_subjects(params):
    """Récupère toutes les pages de résultats"""
    results = []
    url = BASE_URL

    while url:
        response = requests.get(url, headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()

        results.extend(data["data"])
        url = data["pages"]["next_url"]

        time.sleep(1)  # anti-ban 😄
        params = None  # important pour la pagination

    return results


def simplify_subject(subject):
    data = subject["data"]

    return {
        "id": subject["id"],
        "object": subject["object"],
        "url": subject["url"],
        "level": data.get("level"),
        "characters": data.get("characters"),
        "meanings": [m["meaning"] for m in data.get("meanings", [])],
        "readings": [r.get("reading") for r in data.get("readings", [])],
        "examples": data.get("context_sentences", [])
    }


def save_json(level, name, content):
    path = os.path.join(OUTPUT_DIR, f"{level}_{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


for level in range(1, 61):
    print(f"\n📦 Téléchargement du niveau {level}")

    level_data = {}

    for subject_type in ["radical", "kanji", "vocabulary"]:
        print(f"  → {subject_type}")

        params = {
            "levels": level,
            "types": subject_type
        }

        subjects = fetch_all_subjects(params)
        simplified = [simplify_subject(s) for s in subjects]

        level_data[subject_type] = simplified
        save_json(level, subject_type, simplified)

    # fichier "all"
    all_subjects = (
        level_data["radical"]
        + level_data["kanji"]
        + level_data["vocabulary"]
    )

    save_json(level, "all", all_subjects)

    print(
        f"✔ Niveau {level} terminé : "
        f"{len(level_data['radical'])} radicals, "
        f"{len(level_data['kanji'])} kanji, "
        f"{len(level_data['vocabulary'])} vocab"
    )

print("\n🎉 Téléchargement terminé pour les niveaux 1 à 60")
