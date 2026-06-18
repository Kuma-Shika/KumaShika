"""
backup_firestore.py
────────────────────
Sauvegarde locale complète de la base Firestore en JSON.
Lance avant toute migration risquée.

Usage :
    pip install firebase-admin
    python backup_firestore.py
"""

import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccount.json"
USERNAME = "jeremynata"

def doc_to_dict(doc_ref):
    """Lit un document + toutes ses subcollections récursivement."""
    data = doc_ref.get().to_dict() or {}

    for subcol in doc_ref.collections():
        data[f"__subcol__{subcol.id}"] = {}
        for subdoc in subcol.stream():
            data[f"__subcol__{subcol.id}"][subdoc.id] = subdoc.to_dict()

    return data

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print(f"🔍 Sauvegarde de users/{USERNAME}...")
    user_ref = db.collection("users").document(USERNAME)
    backup = doc_to_dict(user_ref)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{USERNAME}_{timestamp}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2, default=str)

    print(f"✅ Sauvegarde terminée → {filename}")
    print(f"   Taille : {len(json.dumps(backup))/1024:.1f} KB")

if __name__ == "__main__":
    main()