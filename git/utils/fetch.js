// utils/fetch.js

export async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Fetch échoué : ${response.status} ${url}`);
    }
    return response.json();
}