import { VIEWS } from "../index/config.js";
import { clearGrid, cardButton } from "../utils/dom.js";
import { getReviewsDue } from "../utils/dailyWords.js";
import { getUserData } from "../index/store.js";

const grid = document.getElementById("grid");

export function renderMainSelect(navigate) {
    clearGrid(grid, "grid-list");

    const userData = getUserData();
    const allSubjects = window.ALL_SUBJECTS ?? {};
    const reviewsDue = userData ? getReviewsDue(userData, allSubjects).length : 0;
    const today = new Date().toISOString().split("T")[0];
    const reviewsDone = userData?.streak?.[today]?.reviews_done ?? 0;
    const reviewSub = reviewsDue === 0
        ? "No reviews due"
        : `${reviewsDue} left`;

    const cards = [
        { icon: "📖", label: "WaniKani", title: "Levels", sub: "Radical · Kanji · Vocabulary", cls: "btn btn-large wanikani", onClick: () => navigate(VIEWS.TYPE) },
        { icon: "✨", label: "Daily", title: "New Words", sub: "60 words · pronunciation", cls: "btn btn-large review", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "daily" } }) },
        { icon: "🔁", label: "Reviews", title: "Due Today", sub: `${reviewSub} cards`, cls: "btn btn-large review", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "reviews" } }) },
        { icon: "🎵", label: "Personal", title: "My Texts", sub: "Lyrics, articles, readings…", cls: "btn btn-large own", onClick: () => navigate(VIEWS.OWN) },
        { icon: "📊", label: "Progress", title: "My progression", sub: "Kanji · Vocabulary", cls: "btn btn-large kanji", onClick: () => navigate(VIEWS.PROGRESS) },
    ];

    cards.forEach(c => grid.appendChild(cardButton(c)));
}