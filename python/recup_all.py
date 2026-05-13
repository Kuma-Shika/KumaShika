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


def save_json(name, content):
    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


subjects = fetch_all_subjects({"levels": "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60"})
liste = []
for elem in subjects:
    liste.append(elem)
    

save_json("all_list", liste)

print("\n🎉 Téléchargement terminé pour les niveaux 1 à 60")
