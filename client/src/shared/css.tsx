import { CivilMode } from "../enums";

export function getCssString(name: string): string {
    let body = document.body;
    let v = getComputedStyle(body).getPropertyValue(name).trim();

    return v;
}

export function getCssBoolean(name: string): boolean {
    return getCssString(name) === "true";
}

export function addToolbarSelectableClasses(mode: CivilMode) {
    switch (mode) {
        case CivilMode.Edit:
            return " selectable-hovering selectable-hovering-edit";
        case CivilMode.Refs:
            return " selectable-hovering selectable-hovering-refs";
        case CivilMode.Memorise:
            return " selectable-hovering selectable-hovering-memorise";
        case CivilMode.UpperInsert:
            return " selectable-hovering selectable-hovering-upper-insert";
        default:
            return "";
    }
}

export function visibleClass(className: string, visible: boolean): string {
    return visible ? ` ${className}-visible ` : ` ${className}-invisible `;
}
