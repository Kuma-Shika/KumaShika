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

dico_rad = {}
dico_kan = {}
dico_vocab = {}
for elem in liste:
    if elem["characters"] is None:
        continue
    if elem["object"] == "radical":
        if not elem["characters"] in dico_rad:
            dico_rad[elem["characters"]] = []
        if elem["characters"] not in dico_rad[elem["characters"]]:
            dico_rad[elem["characters"]].append(elem["id"])
    if elem["object"] == "kanji":
        if not elem["characters"] in dico_kan:
            dico_kan[elem["characters"]] = []
        if elem["characters"] not in dico_kan[elem["characters"]]:
            dico_kan[elem["characters"]].append(elem["id"])
    if elem["object"] == "vocabulary" or elem["object"] == "kana_vocabulary":
        if not elem["characters"] in dico_vocab:
            dico_vocab[elem["characters"]] = []
        if elem["characters"] not in dico_vocab[elem["characters"]]:
            dico_vocab[elem["characters"]].append(elem["id"])
    
print(f"✅ {len(dico_rad)} radicaux")
print(f"✅ {len(dico_kan)} kanji")
print(f"✅ {len(dico_vocab)} vocabulaires")
save_json("rad_to_id", dico_rad)
save_json("kanji_to_id", dico_kan)
save_json("vocab_to_id", dico_vocab)