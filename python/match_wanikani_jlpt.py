import json
import requests
from bs4 import BeautifulSoup

# ── 1. Scrape les 5 niveaux JLPT ─────────────────────────────
BASE_URL = "https://www.nihongo-pro.com/kanji-pal/list/jlpt/{level}"
LEVELS   = ["N5", "N4", "N3", "N2", "N1"]

jlpt_map = {}  # kanji → "N5" | "N4" | ...

for level in LEVELS:
    url = BASE_URL.format(level=level)
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    kanji_list = soup.find("div", class_="kanjiList")
    if not kanji_list:
        print(f"⚠️  Pas de .kanjiList trouvé pour {level}")
        continue

    spans = kanji_list.find_all("span", class_="kanji_clickable")
    kanjis = [s.get_text(strip=True) for s in spans if s.get_text(strip=True)]
    for k in kanjis:
        jlpt_map[k] = level

    print(f"✅ {level} : {len(kanjis)} kanjis chargés")

print(f"\n📦 Total kanjis JLPT indexés : {len(jlpt_map)}\n")

# ── 2. Ouvrir le JSON des sujets ──────────────────────────────
with open("data/all_subjects_simplified.json", "r", encoding="utf-8") as f:
    subjects = json.load(f)  # dict { "1234": { ... }, "1235": { ... }, ... }

# ── 3. Ajouter le champ "jlpt" sur chaque entrée ─────────────
matched = 0
no_match = 0

for obj in subjects.values():
    if obj.get("object") != "kanji":
        obj["jlpt"] = None  # radical / vocabulary → None
        continue

    char  = obj.get("characters") or obj.get("slug", "")
    level = jlpt_map.get(char, "N0")
    obj["jlpt"] = level

    if level != "N0":
        matched += 1
    else:
        no_match += 1

print(f"🎌 Kanjis matchés      : {matched}")
print(f"⬜ Kanjis sans niveau  : {no_match}  (→ N0)")

# ── 4. Sauvegarder dans un nouveau fichier ────────────────────
with open("data/all_subjects_simplified_jlpt.json", "w", encoding="utf-8") as f:
    json.dump(subjects, f, ensure_ascii=False, indent=2)

print(f"\n💾 Fichier sauvegardé : data/all_subjects_simplified_jlpt.json")