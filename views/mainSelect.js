import { VIEWS } from "../index/config.js";
import { clearGrid, cardButton } from "../utils/dom.js";
import { getReviewsDue } from "../utils/dailyWords.js";
import { getUserData } from "../index/store.js";
import { getTodayLocal } from "../utils/date.js";

const grid = document.getElementById("grid");

export function renderMainSelect(navigate) {
    clearGrid(grid, "grid-list");

    const userData = getUserData();
    const today = getTodayLocal();
    const todayStreak = userData?.streak?.[today] ?? {};

    const newDone = todayStreak.new_done ?? 0;
    const reviewsDone = todayStreak.reviews_done ?? 0;
    const reviewsTotal = todayStreak.reviews_number ?? 0;

    const reviewSub = reviewsTotal === 0
        ? "No reviews due"
        : `${reviewsDone} / ${reviewsTotal} done`;

    const dailySub = `${newDone} / 60 done`;

    const cards = [
        { icon: "📖", label: "WaniKani", title: "Levels", sub: "Radical · Kanji · Vocabulary", cls: "btn btn-large wanikani", onClick: () => navigate(VIEWS.TYPE) },
        { icon: "✨", label: "Daily", title: "New Words", sub: dailySub, cls: "btn btn-large daily", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "daily" } }) },
        { icon: "🔁", label: "Reviews", title: "Due Today", sub: reviewSub, cls: "btn btn-large review", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "reviews" } }) },
        { icon: "🎵", label: "Personal", title: "My Texts", sub: "Lyrics, articles, readings…", cls: "btn btn-large own", onClick: () => navigate(VIEWS.OWN) },
        { icon: "📊", label: "Progress", title: "My progression", sub: "Kanji · Vocabulary", cls: "btn btn-large kanji", onClick: () => navigate(VIEWS.PROGRESS) },
    ];

    cards.forEach(c => grid.appendChild(cardButton(c)));
}