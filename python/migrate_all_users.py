"""
migrate_all_users.py
─────────────────────
Pour chaque utilisateur dans /users :
  1. Lit le champ cards du document principal
  2. Copie chaque carte dans la subcollection users/{username}/cards/{cardId}
  3. Supprime le champ cards du document principal

Usage :
    pip install firebase-admin
    python migrate_all_users.py
"""

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"

def migrate_user(db, username, user_data):
    cards = user_data.get("cards")
    if not cards:
        print(f"  ⏭️  {username} — pas de champ 'cards', ignoré")
        return 0

    cards_col = db.collection("users").document(username).collection("cards")

    migrated = 0
    for card_id, card_data in cards.items():
        if card_data is None:
            card_data = {}
        cards_col.document(str(card_id)).set(card_data)
        migrated += 1

    db.collection("users").document(username).update({
        "cards": firestore.DELETE_FIELD
    })

    return migrated

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("🔍 Chargement de tous les utilisateurs...")
    users = list(db.collection("users").stream())
    print(f"📦 {len(users)} utilisateurs trouvés\n")

    total_cards = 0
    for user_doc in users:
        username = user_doc.id
        user_data = user_doc.to_dict() or {}
        print(f"👤 {username}")
        migrated = migrate_user(db, username, user_data)
        if migrated:
            print(f"  ✅ {migrated} cartes migrées")
        total_cards += migrated

    print(f"\n🎉 Migration terminée — {total_cards} cartes migrées au total")

if __name__ == "__main__":
    main()