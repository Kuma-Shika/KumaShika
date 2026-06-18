import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME = "jeremynata"

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print(f"🔍 Chargement des cartes de users/{USERNAME}...")
    cards_ref = db.collection("users").document(USERNAME).collection("cards")
    all_cards = list(cards_ref.stream())

    total = len(all_cards)
    deleted = 0

    for doc in all_cards:
        if not doc.to_dict():
            doc.reference.delete()
            deleted += 1
            print(f"  🗑️  {doc.id} supprimée")

    print(f"\n✅ {deleted}/{total} cartes vides supprimées")

if __name__ == "__main__":
    main()