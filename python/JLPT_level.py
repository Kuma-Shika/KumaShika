import os
import json

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

OUTPUT_DIR = "id_per_jlpt"

def save_json(level, content):
    path = os.path.join(OUTPUT_DIR, f"{level}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

os.makedirs(OUTPUT_DIR, exist_ok=True)
dico_load = load_json("all_subjects_simplified.json")

dico = {}
for key in dico_load:
    subject = dico_load[key]
    level = subject["jlpt"]
    if level is not None:
        if level not in dico:
            dico[level] = []
        dico[level].append(subject)

for level in dico:
    subjects = dico[level]
    simplified = [s["id"] for s in subjects]
    save_json(level, simplified)