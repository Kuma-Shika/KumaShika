"""
patch_streak.py  —  met à jour un champ précis dans le streak d'un utilisateur
"""

import firebase_admin
from firebase_admin import credentials, firestore

CREDS  = "serviceAccount.json"
USER   = "jeremynata"
DATE   = "2026-06-19"
FIELD  = "new_reviews_done"
VALUE  = 62


def main():
    firebase_admin.initialize_app(credentials.Certificate(CREDS))
    db = firestore.client()

    ref = db.collection("users").document(USER)
    ref.update({ f"streak.{DATE}.{FIELD}": VALUE })

    print(f"✓ users/{USER}/streak/{DATE}/{FIELD} = {VALUE}")


if __name__ == "__main__":
    main()