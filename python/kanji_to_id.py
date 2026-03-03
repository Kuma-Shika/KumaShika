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
    if "characters" not in elem["data"] or elem["data"]["characters"] is None:
        continue
    if elem["object"] == "radical":
        if not elem["data"]["characters"] in dico_rad:
            dico_rad[elem["data"]["characters"]] = []
        if elem["data"]["characters"] not in dico_rad[elem["data"]["characters"]]:
            dico_rad[elem["data"]["characters"]].append(elem["id"])
    if elem["object"] == "kanji":
        if not elem["data"]["characters"] in dico_kan:
            dico_kan[elem["data"]["characters"]] = []
        if elem["data"]["characters"] not in dico_kan[elem["data"]["characters"]]:
            dico_kan[elem["data"]["characters"]].append(elem["id"])
    if elem["object"] == "vocabulary" or elem["object"] == "kana_vocabulary":
        if not elem["data"]["characters"] in dico_vocab:
            dico_vocab[elem["data"]["characters"]] = []
        if elem["data"]["characters"] not in dico_vocab[elem["data"]["characters"]]:
            dico_vocab[elem["data"]["characters"]].append(elem["id"])
    
save_json("rad_to_id", dico_rad)
save_json("kanji_to_id", dico_kan)
save_json("vocab_to_id", dico_vocab)