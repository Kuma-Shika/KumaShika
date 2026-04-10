import os
import json

def load_json(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


# ── Parse la frequency list en dict {mot: freq} une seule fois ──

def build_freq_map(freq_list: list) -> dict[str, int]:
    freq_map = {}
    for entry in freq_list:
        if not isinstance(entry, list) or len(entry) < 3 or entry[1] != "freq":
            continue

        word    = entry[0]
        payload = entry[2]

        if isinstance(payload, int):
            freq = payload
        elif isinstance(payload, dict):
            freq = payload.get("frequency") or payload.get("value")
        else:
            continue

        if freq is None:
            continue

        # Garde la fréquence la plus basse (= mot le plus courant) si doublon
        if word not in freq_map or freq < freq_map[word]:
            freq_map[word] = freq

    return freq_map


SURU_SUFFIXES = ["する", "します", "して", "した", "しない", "できる", "すること"]

def lookup_frequency(freq_map: dict, character: str) -> int | None:
    if not character:
        return None

    # 1. Match direct
    if character in freq_map:
        return freq_map[character]

    # 2. Strip する et variantes  →  要約する → 要約
    for suffix in SURU_SUFFIXES:
        if character.endswith(suffix):
            base = character[: -len(suffix)]
            if base and base in freq_map:
                return freq_map[base]

    # 3. Strip honorifique お / ご
    for prefix in ["お", "ご"]:
        if character.startswith(prefix):
            stripped = character[len(prefix):]
            if stripped and stripped in freq_map:
                return freq_map[stripped]

    return None


# ── Main ─────────────────────────────────────────────────────

freq_list   = load_json("assets/term_meta_bank_1.json")
dico_load   = load_json("data/all_subjects_simplified_back_up.json")

freq_map = build_freq_map(freq_list)

result = {}
not_found = []

for key, subject in dico_load.items():
    character = subject.get("characters")
    if not character:
        continue

    freq = lookup_frequency(freq_map, character)

    if freq is not None:
        result[subject["id"]] = {**subject, "frequency": freq}
    else:
        not_found.append(character)
        result[subject["id"]] = {**subject, "frequency": None}

save_json("data/frequency.json", result)

print(f"✅ {len(result)} sujets avec fréquence")
print(f"❌ {len(not_found)} non trouvés : {not_found[:20]}{'...' if len(not_found) > 20 else ''}")