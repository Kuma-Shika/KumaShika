"""
progress_jlpt.py
────────────────
Analyse la progression JLPT jusqu'au N2 pour jeremynata.
Parcourt all_subjects_simplified.json, filtre par niveau (N5→N2)
et fréquence < 10000, puis vérifie dans Firestore.
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict

# ── Config ─────────────────────────────────────────────────────
SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME             = "jeremynata"
JSON_PATH            = "data/all_subjects_simplified.json"
JLPT_ORDER           = ["N5", "N4", "N3", "N2"]
FREQ_MAX             = 100000
# ───────────────────────────────────────────────────────────────

def main():
    # Init Firebase
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Chargement du document utilisateur
    print(f"🔍 Chargement du document users/{USERNAME}...")
    doc = db.collection("users").document(USERNAME).get()
    if not doc.exists:
        print("❌ Document introuvable.")
        return
    user_data = doc.get("cards")
    print(f"✅ {len(user_data)} champs chargés depuis Firestore.\n")

    # Chargement du dictionnaire JSON
    with open(JSON_PATH, encoding="utf-8") as f:
        all_subjects = json.load(f)
    print(f"📖 {len(all_subjects)} entrées dans le dictionnaire.\n")

    # Compteurs par niveau
    stats = {level: {"known": 0, "learning": 0, "unseen": 0, "total": 0}
             for level in JLPT_ORDER}

    for entry_id, entry in all_subjects.items():
        jlpt  = entry.get("jlpt")
        freq  = entry.get("frequency", 99999)

        # Filtre : niveaux N5→N2 uniquement + fréquence < 10000
        if jlpt not in JLPT_ORDER:
            continue
        if freq is None or freq >= FREQ_MAX:
            continue
        if entry.get("object") != "vocabulary":
            continue

        stats[jlpt]["total"] += 1

        card = user_data.get(entry_id)

        if card is None:
            stats[jlpt]["unseen"] += 1
        elif card.get("known") is True:
            stats[jlpt]["known"] += 1
        else:
            stats[jlpt]["learning"] += 1

    # Affichage
    print(f"{'Niveau':<8} {'Total':>7} {'✅ Connus':>10} {'🔄 Apprentissage':>18} {'❓ Pas vus':>12}")
    print("─" * 62)

    grand_total    = 0
    grand_known    = 0
    grand_learning = 0
    grand_unseen   = 0

    for level in JLPT_ORDER:
        s = stats[level]
        t = s["total"]
        if t == 0:
            continue
        pct_known    = s["known"]    / t * 100
        pct_learning = s["learning"] / t * 100
        pct_unseen   = s["unseen"]   / t * 100

        print(f"{level:<8} {t:>7} "
              f"{s['known']:>6} ({pct_known:4.1f}%)  "
              f"{s['learning']:>6} ({pct_learning:4.1f}%)  "
              f"{s['unseen']:>6} ({pct_unseen:4.1f}%)")

        grand_total    += t
        grand_known    += s["known"]
        grand_learning += s["learning"]
        grand_unseen   += s["unseen"]

    print("─" * 62)
    print(f"{'TOTAL':<8} {grand_total:>7} "
          f"{grand_known:>6} ({grand_known/grand_total*100:4.1f}%)  "
          f"{grand_learning:>6} ({grand_learning/grand_total*100:4.1f}%)  "
          f"{grand_unseen:>6} ({grand_unseen/grand_total*100:4.1f}%)")

    print("\n✅ Analyse terminée.")


if __name__ == "__main__":
    main()