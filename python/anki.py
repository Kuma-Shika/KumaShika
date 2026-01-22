import os
import json
import csv

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
    
def clean_text(text):
    '''enlever les balises radical, kanji, vocab, kana-vocab'''
    for tag in ["radical", "kanji", "vocabulary", "kana_vocabulary"]:
        text = text.replace(f"<{tag}>", "").replace(f"</{tag}>", "")
    return text


data = load_json("all_list.json")
#ordonner par level croissant
data.sort(key=lambda x: (x["data"].get("level", 0), x["object"]))

all_subjects = load_json("all_subjects.json")

with open("cards_level.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)

    # Header EXACTEMENT comme tes champs Anki
    writer.writerow([
        "question",
        "main_answer",
        "sub_answer",
        "level",
        "examples", 
        "part_of_speech", 
        "kanji_string", 
        "meaning_string",
        "reading_string", 
        "meaning_mnemonic"
    ])

    for card in data:
        if card["object"] != "vocabulary" and card["object"] != "kana_vocabulary":
            continue
        d = card["data"]

        # Question
        vocab_jp = d.get("characters", "")

        # Meaning principal
        meaning = next(
            (m["meaning"] for m in d.get("meanings", []) if m.get("primary")),
            ""
        )

        # Reading principal
        reading = next(
            (r["reading"] for r in d.get("readings", []) if r.get("primary")),
            ""
        )

        meanings = ", ".join([m["meaning"] for m in d.get("meanings", [])])
        readings = ", ".join([r["reading"] for r in d.get("readings", [])])

        # Level & type
        level = d.get("level", "")

        # Examples formatés
        examples = " \n\n ".join(
            f'{ex["ja"]} \n {ex["en"]}'
            for ex in d.get("context_sentences", [])
        )

        liste_kanji = d.get("component_subject_ids", [])
        kanji_string = ""
        meaning_string = ""
        reading_string = ""
        for subject_id in liste_kanji:
            subject = all_subjects.get(str(subject_id), {})
            kanji_string += subject.get("data", {}).get("characters", "") + "|"
            meaning_string += ", ".join(m["meaning"] for m in subject.get("data", {}).get("meanings", [])) + "|"
            reading_string += ", ".join(r["reading"] for r in subject.get("data", {}).get("readings", [])) + "|"
        if kanji_string.endswith("|"):
            kanji_string = kanji_string[:-1]
            meaning_string = meaning_string[:-1]
            reading_string = reading_string[:-1]

        meaning_mnemonic = d.get("meaning_mnemonic")
            

        writer.writerow([
            vocab_jp,
            meanings,
            readings,
            level,
            clean_text(examples), 
            ", ".join(d.get("parts_of_speech", [])),
            kanji_string,
            meaning_string,
            reading_string,
            clean_text(meaning_mnemonic)
        ])

        writer.writerow([
            meanings,
            readings,
            vocab_jp,
            level,
            clean_text(examples),
            ", ".join(d.get("parts_of_speech", [])),
            kanji_string,
            meaning_string,
            reading_string,
            clean_text(meaning_mnemonic)
        ])


