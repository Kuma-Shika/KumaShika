import os
import json
import csv

def load_json(filename):
    path = os.path.join("data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# Charger les données
data = load_json("all_list.json")

# Trier par niveau
data.sort(key=lambda x: (x["data"].get("level", 0), x["object"]))

# Créer dossier output si pas existant
os.makedirs("output_levels", exist_ok=True)

# Initialiser writers par niveau
writers = {}
files = {}

for level in range(1, 61):
    file_path = os.path.join("output_levels", f"level_{level}.csv")
    f = open(file_path, "w", newline="", encoding="utf-8")
    writer = csv.writer(f)
    
    # Header simple
    writer.writerow(["question_meaning", "kanji", "reading"])
    
    writers[level] = writer
    files[level] = f

# Remplir les fichiers
for card in data:
    if card["object"] not in ["vocabulary", "kana_vocabulary"]:
        continue

    d = card["data"]

    level = d.get("level")
    if level not in writers:
        continue

    # Meaning principal (question)
    meaning = next(
        (m["meaning"] for m in d.get("meanings", []) if m.get("primary")),
        ""
    )

    # Kanji
    vocab_jp = d.get("characters", "")

    # Reading principal
    reading = next(
        (r["reading"] for r in d.get("readings", []) if r.get("primary")),
        ""
    )

    # Écriture ligne
    writers[level].writerow([
        meaning,
        vocab_jp,
        reading
    ])

# Fermer tous les fichiers
for f in files.values():
    f.close()

print("✅ CSV générés dans le dossier 'output_levels'")