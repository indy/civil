import { DeckKind, Key, SlimDeck, ToolbarMode } from "./types";

export function buildUrl(deckKind: DeckKind, id: Key, prefix?: string): string {
    if (prefix) {
        return `${prefix}/${deckKindToResourceString(deckKind)}/${id}`;
    } else {
        return `/${deckKindToResourceString(deckKind)}/${id}`;
    }
}

export function resourceStringToDeckKind(s: string): DeckKind | undefined {
    if (s === "articles") {
        return DeckKind.Article;
    }
    if (s === "ideas") {
        return DeckKind.Idea;
    }
    if (s === "people") {
        return DeckKind.Person;
    }
    if (s === "timelines") {
        return DeckKind.Timeline;
    }
    if (s === "quotes") {
        return DeckKind.Quote;
    }
    return undefined;
}

export function deckKindToResourceString(deckKind: DeckKind): string {
    switch (deckKind) {
        case DeckKind.Article:
            return "articles";
        case DeckKind.Idea:
            return "ideas";
        case DeckKind.Person:
            return "people";
        case DeckKind.Timeline:
            return "timelines";
        case DeckKind.Quote:
            return "quotes";
    }
}

export function deckKindToHeadingString(deckKind: DeckKind): string {
    switch (deckKind) {
        case DeckKind.Article:
            return "Article";
        case DeckKind.Idea:
            return "Idea";
        case DeckKind.Person:
            return "Person";
        case DeckKind.Timeline:
            return "Timeline";
        case DeckKind.Quote:
            return "Quote";
    }
}

export function addToolbarSelectableClasses(toolbarMode: ToolbarMode) {
    switch (toolbarMode) {
        case ToolbarMode.Edit:
            return " selectable-container-hovering selectable-container-hovering-edit";
        case ToolbarMode.Refs:
            return " selectable-container-hovering selectable-container-hovering-refs";
        case ToolbarMode.SR:
            return " selectable-container-hovering selectable-container-hovering-sr";
        case ToolbarMode.AddAbove:
            return " selectable-container-hovering selectable-container-hovering-add-above";
        default:
            return "";
    }
}

export function indexToShortcut(index: number) {
    if (index < 9) {
        return String.fromCharCode(index + 49);
    } else {
        return String.fromCharCode(index - 9 + 65).toLowerCase();
    }
}

export function sortByResourceThenName(a: SlimDeck, b: SlimDeck): number {
    if (a.deckKind < b.deckKind) {
        return -1;
    }
    if (a.deckKind > b.deckKind) {
        return 1;
    }

    let titleA = a.title.toUpperCase();
    let titleB = b.title.toUpperCase();
    if (titleA < titleB) {
        return -1;
    }

    if (titleA > titleB) {
        return 1;
    }

    // titles must be equal
    return 0;
}
