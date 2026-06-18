"""
migrate_to_chunks.py
====================
Migre les cartes de :
  users/{username}/cards/{cardId}          (ancienne architecture : 1 doc / carte)
vers :
  users/{username}/card_chunks/{chunkId}   (nouvelle : 1000 cartes / doc)

  chunk 0     → cartes dont l'ID est dans [0,    999]
  chunk 1000  → cartes dont l'ID est dans [1000, 1999]
  ...
  chunk 19000 → cartes dont l'ID est dans [19000, 19999]

Usage :
  pip install firebase-admin
  python migrate_to_chunks.py --creds serviceAccountKey.json --dry-run   # simulation
  python migrate_to_chunks.py --creds serviceAccountKey.json             # migration réelle
  python migrate_to_chunks.py --creds serviceAccountKey.json --user jeremynata  # un seul user
"""

import argparse
from collections import defaultdict
import firebase_admin
from firebase_admin import credentials, firestore

CHUNK_SIZE = 1000


# ── helpers ───────────────────────────────────────────────────────────────────

def chunk_id_for(card_id: int) -> int:
    return (card_id // CHUNK_SIZE) * CHUNK_SIZE


def migrate_user(db, username: str, dry_run: bool) -> dict:
    cards_ref = db.collection("users").document(username).collection("cards")
    cards_snaps = list(cards_ref.stream())

    if not cards_snaps:
        print(f"  [{username}] aucune carte — ignoré")
        return {"cards": 0, "chunks": 0}

    # ── regrouper par chunk ───────────────────────────────────────────────────
    chunks: dict[int, dict] = defaultdict(dict)
    non_int_ids = []

    for snap in cards_snaps:
        try:
            card_id = int(snap.id)
        except ValueError:
            non_int_ids.append(snap.id)
            continue
        chunks[chunk_id_for(card_id)][snap.id] = snap.to_dict()

    total_cards = sum(len(v) for v in chunks.values())

    if non_int_ids:
        print(f"  [{username}] ⚠ {len(non_int_ids)} ID(s) non-entier(s) ignoré(s) : "
              f"{non_int_ids[:5]}{'…' if len(non_int_ids) > 5 else ''}")

    print(f"  [{username}] {total_cards} cartes → {len(chunks)} chunk(s)")

    if dry_run:
        for cid in sorted(chunks):
            print(f"    chunk {cid:>6} : {len(chunks[cid])} cartes")
        return {"cards": total_cards, "chunks": 0}

    # ── écriture ──────────────────────────────────────────────────────────────
    chunks_written = 0
    for cid in sorted(chunks):
        ref = (db.collection("users")
                 .document(username)
                 .collection("card_chunks")
                 .document(str(cid)))
        ref.set({"cards": chunks[cid]})
        chunks_written += 1
        print(f"    ✓ chunk {cid:>6} écrit ({len(chunks[cid])} cartes)")

    return {"cards": total_cards, "chunks": chunks_written}


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Migration cartes → card_chunks")
    parser.add_argument("--creds", required=True, help="Chemin vers serviceAccountKey.json")
    parser.add_argument("--dry-run", action="store_true", help="Simule sans écrire")
    parser.add_argument("--user", help="Migrer un seul utilisateur (optionnel)")
    args = parser.parse_args()

    firebase_admin.initialize_app(credentials.Certificate(args.creds))
    db = firestore.client()

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Démarrage de la migration…\n")

    usernames = (
        [args.user] if args.user
        else [u.id for u in db.collection("users").stream()]
    )
    print(f"{len(usernames)} utilisateur(s) : {usernames}\n")

    total_cards = total_chunks = 0
    for username in usernames:
        print(f"→ {username}")
        r = migrate_user(db, username, dry_run=args.dry_run)
        total_cards  += r["cards"]
        total_chunks += r["chunks"]
        print()

    print("=" * 50)
    print(f"{'Simulation' if args.dry_run else 'Migration'} terminée.")
    print(f"  Cartes lues   : {total_cards}")
    print(f"  Chunks écrits : {total_chunks}")
    if args.dry_run:
        print("\n⚠  Aucune écriture effectuée. Relancez sans --dry-run pour appliquer.")


if __name__ == "__main__":
    main()