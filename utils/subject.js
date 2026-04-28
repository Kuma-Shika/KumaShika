// utils/subject.js
// Toutes les fonctions qui interrogent userData ou ALL_SUBJECTS
import { getUserData } from "../index/store.js";

export function isKnown(id) {
    const userData = getUserData();
    return userData?.cards?.[id]?.known === true;
}

export function inProgress(id) {
    const userData = getUserData();
    return id in (userData?.cards ?? {});
}

export function getCardStat(id, exercise) {
    const userData = getUserData();
    return userData?.cards?.[id]?.[exercise] ?? { attempts: 0, correct: 0 };
}