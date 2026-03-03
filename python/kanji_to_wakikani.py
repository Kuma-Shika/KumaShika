import os
import json

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
    

OUTPUT_DIR = "assets"

def save_json(name, content):
    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

liste = load_json("all_list.json")

dico = {}
for elem in liste:
    if "characters" not in elem["data"] or elem["data"]["characters"] is None:
        continue
    sub = ""
    for characters in elem["data"]["characters"]:
        sub += characters
        if not sub in dico:
            dico[sub] = []
        if not elem["data"]["characters"] in dico[sub]:
            dico[sub].append(elem["data"]["characters"])

save_json("kanji_to_wanikani", dico)