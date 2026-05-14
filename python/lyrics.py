import requests
from bs4 import BeautifulSoup
import os
import sys
import re


def sanitize_filename(name: str) -> str:
    """Supprime les caractères interdits dans un nom de fichier et remplace les espaces par _."""

    return re.sub(r'[\\/*?:"<>|]', "", name).strip().replace(" ", "_")


def scrape_lyrics(url: str) -> None:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }

    print(f"🌐 Récupération de la page : {url}")
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    # Force l'encodage UTF-8 si le site ne le précise pas
    response.encoding = response.apparent_encoding

    soup = BeautifulSoup(response.text, "html.parser")

    # ── Détection du type de page ──────────────────────────────────────────────
    if "/song/" in url:
        mode = "song"
    elif "/movie/" in url:
        mode = "movie"
    else:
        raise ValueError("L'URL doit contenir '/song/' ou '/movie/'.")
    print(f"📄 Mode détecté : {mode}")

    # ── Titre (h2 dans les deux cas) ───────────────────────────────────────────
    h2_tag = soup.find("h2")
    if not h2_tag:
        raise ValueError("Aucune balise <h2> trouvée sur la page.")
    title = h2_tag.get_text(separator=" ", strip=True)
    print(f"🎵 Titre trouvé : {title}")

    # ── Zone des paroles ───────────────────────────────────────────────────────
    if mode == "song":
        kashi_div = soup.find("div", id="kashi_area")
        if not kashi_div:
            raise ValueError("Aucun div avec id='kashi_area' trouvé sur la page.")

    elif mode == "movie":
        # Structure : div.row.kashi > div.col-* > h2 + div(paroles)
        row_kashi = soup.find("div", class_=lambda c: c and "row" in c.split() and "kashi" in c.split())
        if not row_kashi:
            raise ValueError("Aucun div class='row kashi' trouvé sur la page.")
        inner_div = row_kashi.find("div")
        if not inner_div:
            raise ValueError("Aucun div enfant trouvé dans 'row kashi'.")
        # Le div des paroles est le premier div après le h2
        kashi_div = inner_div.find("div")
        if not kashi_div:
            raise ValueError("Aucun div de paroles trouvé dans 'row kashi'.")

    # Convertit les <br> en sauts de ligne, puis extrait le texte propre
    for br in kashi_div.find_all("br"):
        br.replace_with("\n")

    lyrics = kashi_div.get_text()

    # Nettoie les lignes vides multiples (garde au maximum une ligne vide entre strophes)
    lyrics = re.sub(r"\n{3,}", "\n\n", lyrics).strip()

    # ── Sauvegarde ─────────────────────────────────────────────────────────────
    os.makedirs("lyrics", exist_ok=True)

    safe_title = sanitize_filename(title)
    filename = os.path.join("lyrics", f"{safe_title}_lyrics.txt")

    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"{title}\n")
        f.write("=" * len(title) + "\n\n")
        f.write(lyrics)

    print(f"✅ Paroles sauvegardées dans : {filename}")


if __name__ == "__main__":

    target_url = "https://www.uta-net.com/song/386053/"
    scrape_lyrics(target_url)