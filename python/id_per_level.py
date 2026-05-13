import os
import json

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

OUTPUT_DIR = "id_per_level"

def save_json(level, name, content):
    path = os.path.join(OUTPUT_DIR, f"{level}_{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


os.makedirs(OUTPUT_DIR, exist_ok=True)
liste = load_json("all_list.json")

dico = {}
for level in range(1, 61):
    for typee in ["radical", "kanji", "vocabulary"]:
        dico[(level, typee)] = []

for subject in liste:
    level = subject["data"].get("level")
    typee = subject["object"]
    if typee == "kana_vocabulary":
        typee = "vocabulary"
    if subject["data"]["characters"] is not None:
        dico[(level, typee)].append(subject)

for key in dico:
    level, typee = key
    subjects = dico[key]
    simplified = [s["id"] for s in subjects]
    save_json(level, typee, simplified)






