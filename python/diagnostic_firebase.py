"""
diagnose_firestore.py
─────────────────────
Analyse les entrées d'index Firestore pour un document utilisateur.
Firestore indexe :
  - Chaque valeur scalaire d'un array  → 2 entrées par élément
  - Chaque clé d'un map imbriqué       → 2 entrées par champ scalaire
  - Les strings/numbers/booleans       → 2 entrées chacun

Usage :
    pip install firebase-admin
    python diagnose_firestore.py
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore

# ── Config ────────────────────────────────────────────────────
SERVICE_ACCOUNT_PATH = "serviceAccount.json"  # ← ton fichier de clé Firebase
USERNAME             = "jeremynata"            # ← ton username Firestore
# ─────────────────────────────────────────────────────────────

def count_index_entries(value, path=""):
    """
    Calcule récursivement le nombre d'entrées d'index Firestore.
    - Scalaire      → 2 entrées
    - Array[n]      → 2 * n entrées (chaque élément indexé)
    - Map           → somme récursive des champs (pas d'index sur les clés elles-mêmes)
    """
    entries = []

    if isinstance(value, dict):
        for k, v in value.items():
            child_path = f"{path}.{k}" if path else k
            entries.extend(count_index_entries(v, child_path))

    elif isinstance(value, list):
        for i, item in enumerate(value):
            child_path = f"{path}[{i}]"
            if isinstance(item, (str, int, float, bool)) or item is None:
                # Chaque élément d'array scalaire = 2 entrées
                entries.append((child_path, 2))
            else:
                entries.extend(count_index_entries(item, child_path))

    else:
        # Scalaire hors array = 2 entrées
        entries.append((path, 2))

    return entries


def summarize(entries, top_n=30):
    """Agrège les entrées par préfixe de chemin (niveau 1 et 2)."""
    from collections import defaultdict
    by_top   = defaultdict(int)
    by_top2  = defaultdict(int)

    for path, cost in entries:
        parts = path.split(".")
        top  = parts[0]
        top2 = ".".join(parts[:2]) if len(parts) > 1 else parts[0]
        by_top[top]   += cost
        by_top2[top2] += cost

    print("\n── Top champs niveau 1 ──────────────────────────────────")
    for k, v in sorted(by_top.items(), key=lambda x: -x[1])[:top_n]:
        bar = "█" * min(50, v // 100)
        print(f"  {v:>6}  {k:<40} {bar}")

    print("\n── Top champs niveau 2 (sous-clés) ─────────────────────")
    for k, v in sorted(by_top2.items(), key=lambda x: -x[1])[:top_n]:
        bar = "█" * min(50, v // 100)
        print(f"  {v:>6}  {k:<60} {bar}")


def find_large_arrays(data, path="", threshold=50):
    """Trouve tous les arrays dépassant le seuil."""
    results = []
    if isinstance(data, dict):
        for k, v in data.items():
            results.extend(find_large_arrays(v, f"{path}.{k}" if path else k, threshold))
    elif isinstance(data, list):
        if len(data) >= threshold:
            results.append((path, len(data)))
        for i, item in enumerate(data):
            results.extend(find_large_arrays(item, f"{path}[{i}]", threshold))
    return results


def main():
    # Init Firebase
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print(f"🔍 Chargement du document users/{USERNAME}...")
    doc = db.collection("users").document(USERNAME).get()
    if not doc.exists:
        print("❌ Document introuvable.")
        return

    data = doc.to_dict()

    # Sauvegarde locale pour inspection manuelle
    with open("user_data_dump.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print("💾 Données sauvegardées dans user_data_dump.json")

    # Comptage des entrées d'index
    print("\n🔢 Calcul des entrées d'index...")
    entries = count_index_entries(data)
    total = sum(c for _, c in entries)

    print(f"\n{'='*60}")
    print(f"  TOTAL ESTIMÉ : {total:,} entrées d'index")
    print(f"  LIMITE       : 20,000")
    print(f"  STATUT       : {'🔴 DÉPASSÉ' if total > 20000 else '🟡 PROCHE' if total > 15000 else '🟢 OK'}")
    print(f"{'='*60}")

    summarize(entries)

    # Arrays suspects
    print("\n── Arrays larges (≥50 éléments) ─────────────────────────")
    large = find_large_arrays(data, threshold=50)
    if large:
        for path, size in sorted(large, key=lambda x: -x[1]):
            print(f"  {size:>6} éléments  →  {path}")
    else:
        print("  Aucun array large trouvé.")

    print("\n✅ Diagnostic terminé.")


if __name__ == "__main__":
    main()