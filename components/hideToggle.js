// components/hideToggle.js
export function hideToggle(onChange) {
    const label = document.createElement("label");
    label.className = "progress-hide-toggle";
    label.innerHTML = `
        <input type="checkbox" id="hideKnownCheck" />
        <div class="switch"></div>
        <span>Hide known</span>
    `;
    label.querySelector("#hideKnownCheck").onchange = e => onChange(e.target.checked);
    return label;
}