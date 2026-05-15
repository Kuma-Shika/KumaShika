// utils/subject.js
// Toutes les fonctions qui interrogent userData ou ALL_SUBJECTS
import { getUserData } from "../index/store.js";
import { MAX_LEVEL } from "../index/config.js";

export function isKnown(id) {
    const userData = getUserData();
    return userData?.cards?.[id]?.known === true;
}

export function isStudying(id) {
    const userData = getUserData();
    return userData?.cards?.[id]?.srs_level >= 0 && userData?.cards?.[id]?.known !== true;
}

export function inProgress(id) {
    const userData = getUserData();
    return id in (userData?.cards?.srs_level || {});
}

export function getCardStat(id, exercise) {
    const userData = getUserData();
    return userData?.cards?.[id]?.[exercise] ?? { attempts: 0, correct: 0 };
}

export function getProgressItems(progressType) {
    return Object.values(window.ALL_SUBJECTS || {}).filter(item =>
        progressType === "kanji"
            ? item.object === "kanji"
            : item.object === "vocabulary" || item.object === "kana_vocabulary"
    );
}

export function isLevelDone(userData, type, level) {
    return type.exercises.every(ex =>
        userData?.levels?.[`${level}-${ex.index}`]?.length > 0
    );
}

export function completedLevels(userData, type) {
    return Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)
        .filter(lvl => isLevelDone(userData, type, lvl)).length;
}