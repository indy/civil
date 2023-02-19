import { route } from "preact-router";

import {
    AnyDeckListing,
    DeckKind,
    Key,
    SlimDeck,
    RefKind,
    ToolbarMode,
} from "./types";

import Net from "./Net";
import { AppStateChange } from "./AppState";

export function buildUrl(
    deckKind: DeckKind,
    id: Key,
    prefix?: string
): string {
    if (prefix) {
        return `${prefix}/${deckKindToResourceString(deckKind)}/${id}`;
    } else {
        return `/${deckKindToResourceString(deckKind)}/${id}`;
    }
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

export function stringToRefKind(s: string): RefKind | undefined {
    if (s === "Ref") {
        return RefKind.Ref;
    }
    if (s === "RefToParent") {
        return RefKind.RefToParent;
    }
    if (s === "RefToChild") {
        return RefKind.RefToChild;
    }
    if (s === "RefInContrast") {
        return RefKind.RefInContrast;
    }
    if (s === "RefCritical") {
        return RefKind.RefCritical;
    }
    return undefined;
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

export function createDeck(deckKind: DeckKind, title: string) {
    type ProtoDeck = {
        title: string;
    };

    // creates a new deck
    const data: ProtoDeck = {
        title: title,
    };

    const resource = deckKindToResourceString(deckKind);

    Net.post<ProtoDeck, SlimDeck>(`/api/${resource}`, data).then((deck) => {
        Net.get<AnyDeckListing>(`/api/${resource}/listings`).then((listing) => {
            AppStateChange.setDeckListing(deckKind, listing);
            AppStateChange.invalidateGraph();
        });
        route(`/${resource}/${deck.id}`);
    });
}

export function indexToShortcut(index: number) {
    if (index < 9) {
        return String.fromCharCode(index + 49);
    } else {
        return String.fromCharCode(index - 9 + 65).toLowerCase();
    }
}

export function fetchDeckListing(deckKind: DeckKind, url: string) {
    console.error("REPLACE fetchDeckListing WITH ILISTING SPECIFIC VARIANTS");
    Net.get<Array<SlimDeck>>(url || `/api/${deckKind}`).then((listing) => {
        AppStateChange.setDeckListing(deckKind, listing);
    });
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
