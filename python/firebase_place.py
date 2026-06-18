import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME = "jeremynata"

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print(f"🔍 Chargement du document users/{USERNAME}...")
    doc = db.collection("users").document(USERNAME).get()
    data = doc.to_dict()

    cards = data.get("cards", {})
    total = len(cards)
    cleaned = 0

    updates = {}
    for card_id, card_data in cards.items():
        if card_data.get("known") == True:
            updates[f"cards.{card_id}"] = {"known": True}
            cleaned += 1
            print(f"  🧹 {card_id} nettoyée")

    if updates:
        db.collection("users").document(USERNAME).update(updates)

    print(f"\n✅ {cleaned}/{total} cartes nettoyées")

if __name__ == "__main__":
    main()