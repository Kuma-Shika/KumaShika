import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME = "jeremynata"

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    doc_ref = db.collection("users").document(USERNAME)
    data = doc_ref.get().to_dict()

    if "cards" not in data:
        print("✅ Aucun champ 'cards' trouvé, rien à faire.")
        return

    print(f"🗑️  Suppression du champ 'cards' ({len(data['cards'])} entrées)...")
    doc_ref.update({ "cards": firestore.DELETE_FIELD })
    print("✅ Champ 'cards' supprimé du document principal.")

if __name__ == "__main__":
    main()