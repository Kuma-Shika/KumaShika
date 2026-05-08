import { VIEWS } from "../index/config.js";
import { cardButton } from "../utils/dom.js";

const grid = document.getElementById("grid");
export function renderMainSelect(navigate) {
    grid.className = "grid grid-list";

    const cards = [
        { icon: "📖", label: "WaniKani", title: "Levels", sub: "Radical · Kanji · Vocabulary", cls: "btn btn-large wanikani", onClick: () => navigate(VIEWS.TYPE) },
        { icon: "🔁", label: "SRS", title: "Reviews", sub: "Cards due today", cls: "btn btn-large review", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "reviews" } }) },
        { icon: "🎵", label: "Personal", title: "My Texts", sub: "Lyrics, articles, readings…", cls: "btn btn-large own", onClick: () => navigate(VIEWS.OWN) },
        { icon: "📊", label: "Progress", title: "My progression", sub: "Kanji · Vocabulary", cls: "btn btn-large kanji", onClick: () => navigate(VIEWS.PROGRESS) },
    ];

    cards.forEach(c => grid.appendChild(cardButton(c)));
}