import { VIEWS } from "../index/config.js";
import { clearGrid, cardButton } from "../utils/dom.js";
import { getReviewsDue } from "../utils/dailyWords.js";
import { getUserData } from "../index/store.js";
import { getTodayLocal } from "../utils/date.js";

const grid = document.getElementById("grid");

export function renderMainSelect(navigate) {
    clearGrid(grid, "grid-list");
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));

    const userData = getUserData();
    const today = getTodayLocal();
    const todayStreak = userData?.streak?.[today] ?? {};

    const discoverNew = todayStreak.discover_new ?? 0;
    const reviewsOld = todayStreak.old_reviews_number ?? 0;
    const reviewsNew = todayStreak.new_reviews_number ?? 0;
    const reviewsAll = todayStreak.all_reviews_number ?? 0;
    const doneOld = todayStreak.old_reviews_done ?? 0;
    const doneNew = todayStreak.new_reviews_done ?? 0;

    const reviewSub = reviewsAll === 0
        ? "No reviews due"
        : `${doneOld + doneNew} / ${reviewsAll} done`;
    const dailySub = `${discoverNew} / 60 done`;

    const cards = [
        { icon: "📖", label: "WaniKani", title: "Levels", sub: "Radical · Kanji · Vocabulary", cls: "btn btn-large wanikani", onClick: () => navigate(VIEWS.TYPE) },
        { icon: "✨", label: "Daily", title: "New Words", sub: dailySub, cls: "btn btn-large daily", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "daily" } }) },
        { icon: "🔁", label: "Reviews", title: "Due Today", sub: reviewSub, cls: "btn btn-large review", onClick: () => navigate(VIEWS.QUIZ, { quizParams: { mode: "reviews" } }) },
        { icon: "🎵", label: "Personal", title: "My Texts", sub: "Lyrics, articles, readings…", cls: "btn btn-large own", onClick: () => navigate(VIEWS.OWN) },
        { icon: "📊", label: "Progress", title: "My progression", sub: "Kanji · Vocabulary", cls: "btn btn-large kanji", onClick: () => navigate(VIEWS.PROGRESS) },
    ];

    cards.forEach(c => grid.appendChild(cardButton(c)));
}