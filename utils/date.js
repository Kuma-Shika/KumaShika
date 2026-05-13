// utils/date.js
export function getTodayLocal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = parseInt(String(now.getDate()).padStart(2, "0"));
    return `${year}-${month}-${day}`;
}

export function increaseDate(date, days) {
    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + days);
    const yearResult = dateObj.getFullYear();
    const monthResult = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dayResult = String(dateObj.getDate()).padStart(2, "0");
    return `${yearResult}-${monthResult}-${dayResult}`;
}

export function formatDate(date) {
    return getTodayLocal.call(null) // même logique appliquée à date
}