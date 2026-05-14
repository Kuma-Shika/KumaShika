"""
migrate_remove_occurrences.py
──────────────────────────────
Supprime le champ `occurrences` de toutes les cartes Firestore.
Réduit drastiquement le nombre d'entrées d'index.

Usage :
    python migrate_remove_occurrences.py
"""

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME             = "jeremynata"

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print(f"🔍 Chargement du document users/{USERNAME}...")
    ref = db.collection("users").document(USERNAME)
    doc = ref.get()
    if not doc.exists:
        print("❌ Document introuvable.")
        return

    data = doc.to_dict()
    cards = data.get("cards", {})

    # Compter combien de cartes ont des occurrences
    cards_with_occ = {k: v for k, v in cards.items() if "occurrences" in v}
    total_occ = sum(len(v["occurrences"]) for v in cards_with_occ.values())
    print(f"📊 {len(cards_with_occ)} cartes avec occurrences ({total_occ} éléments au total)")

    if not cards_with_occ:
        print("✅ Aucune occurrence à supprimer.")
        return

    # Supprimer le champ occurrences de chaque carte concernée
    updates = {}
    for card_id in cards_with_occ:
        updates[f"cards.{card_id}.occurrences"] = firestore.DELETE_FIELD

    print(f"🗑️  Suppression de {len(updates)} champs occurrences...")
    ref.update(updates)

    print("✅ Migration terminée — occurrences supprimées.")
    print("   Les données d'occurrence restent dans ownLevels.*.rawText")

if __name__ == "__main__":
    main()