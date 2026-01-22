import os
import json

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
    

OUTPUT_DIR = "data"

def save_json(name, content):
    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

liste = load_json("all_list.json")

dico = {}
for elem in liste:
    if "readings" not in elem["data"]:
        continue
    for readings in elem["data"]["readings"]:
        reading = readings["reading"]
        if not reading in dico:
            dico[reading] = []
        if not elem["data"]["characters"] in dico[reading]:
            dico[reading].append(elem["data"]["characters"])


save_json("reading_to_kanji", dico)




