// store.js
let _userData = null;
let _username = null;

// userData
export function setUserData(data) { _userData = data; }
export function getUserData() { return _userData; }

// session
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