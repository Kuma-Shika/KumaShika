import os
import json

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
    
def simplify_subject(subject):
    data = subject["data"]
    object_type = subject["object"]
    if subject["object"] == "kana_vocabulary":
        object_type = "vocabulary"

    return {
        "id": subject["id"],
        "object": object_type,
        "url": subject["url"],
        "level": data.get("level"),
        "characters": data.get("characters"),
        "meanings": [m["meaning"] for m in data.get("meanings", [])],
        "readings": [r.get("reading") for r in data.get("readings", [])],
        "examples": data.get("context_sentences", []),
        "radical_to_kanji": data.get("amalgamation_subject_ids", []),
        "meaning_mnemonic": data.get("meaning_mnemonic", ""),
        "reading_mnemonic": data.get("reading_mnemonic", ""),
        "kanji_to_vocab": data.get("amalgamation_subject_ids", []),
        "radical_from_kanji": data.get("component_subject_ids", []),
        "part_of_speech": data.get("parts_of_speech", []),
        "kanji_from_vocab": data.get("component_subject_ids", []),
    }

OUTPUT_DIR = "data"

def save_json(content):
    path = os.path.join(OUTPUT_DIR, "all_subjects_simplified.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

liste = load_json("all_list.json")

dico = {}

for i in reversed(range(len(liste))):
    subject = liste[i]
    if subject["object"] == "kana_vocabulary":
        subject["object"] = "vocabulary"
    if subject["data"]["characters"] is None:
        liste.pop(i)

simplified = {int(s["id"]): simplify_subject(s) for s in liste}
save_json(simplified)






