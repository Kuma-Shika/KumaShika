import json
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
    print(f"📦 {total} cartes trouvées")

    for i, (card_id, card_data) in enumerate(cards.items()):
        db.collection("users").document(USERNAME)\
          .collection("cards").document(str(card_id))\
          .set(card_data)
        print(f"  ✅ {i+1}/{total} — carte {card_id}")

    print(f"\n🎉 Migration terminée — {total} cartes migrées")

if __name__ == "__main__":
    main()