// store.js
let _userData = null;
let _username = null;

export function setUserData(data) { _userData = data; }
export function getUserData() { return _userData; }

export function patchCardKnown(wordId, known) {
    if (!_userData) return;
    if (!_userData.cards) _userData.cards = {};
    if (!_userData.cards[wordId]) _userData.cards[wordId] = {};
    _userData.cards[wordId].known = known;
}

export function patchCardSRS(wordId, exercise, srsLevel) {
    if (!_userData) return;
    if (!_userData.cards) _userData.cards = {};
    if (!_userData.cards[wordId]) _userData.cards[wordId] = {};
    if (!_userData.cards[wordId][exercise]) _userData.cards[wordId][exercise] = {};
    _userData.cards[wordId][exercise].srs_level = srsLevel;
}

export function setCurrentUser(name) {
    _username = name;
    if (name) localStorage.setItem("currentUser", name);
    else localStorage.removeItem("currentUser");
}

export function getCurrentUser() {
    if (!_username) _username = localStorage.getItem("currentUser");
    return _username;
}

export function clearCurrentUser() {
    _username = null;
    localStorage.removeItem("currentUser");
}