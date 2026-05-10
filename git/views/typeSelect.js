// views/typeSelect.js
import { VIEWS, TYPES, MAX_LEVEL } from "../index/config.js";
import { clearGrid, backButton, cardButton } from "../utils/dom.js";
import { isLevelDone, completedLevels } from "../utils/subject.js";

const grid = document.getElementById("grid");

export function renderTypeSelect(userData, navigate) {
    clearGrid(grid, "grid-list");

    grid.appendChild(backButton("← Home", () => navigate(VIEWS.MAIN)));

    for (const [typeKey, type] of Object.entries(TYPES)) {
        grid.appendChild(cardButton({
            cls: `btn btn-large ${typeKey}`,
            icon: type.icon,
            label: type.sublabel,
            title: type.label,
            sub: `${completedLevels(userData, type)} / ${MAX_LEVEL} levels completed`,
            onClick: () => navigate(VIEWS.LEVEL, { type: typeKey }),
        }));
    }
}