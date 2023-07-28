import { CivilMode, State, DeckKind, Key } from "types";

import { deckKindToResourceString } from "shared/deck";

export function buildUrl(deckKind: DeckKind, id: Key, prefix?: string): string {
    if (prefix) {
        return `${prefix}/${deckKindToResourceString(deckKind)}/${id}`;
    } else {
        return `/${deckKindToResourceString(deckKind)}/${id}`;
    }
}

export function nonEmptyArray<T>(arr: Array<T>) {
    return arr && arr.length > 0;
}

export function isCivilModeAllowed(state: State, mode: CivilMode): boolean {
    // e.g. state.url.value = /articles or /ideas/42
    // urlParts is of either one of these forms: ["", "articles"], or ["", "ideas", "42"]
    let urlParts = state.url.value.split("/");

    const onListingPage = urlParts.length === 2;

    switch (mode) {
        case CivilMode.View:
            return !onListingPage;
        case CivilMode.Edit:
            return !onListingPage;
        case CivilMode.Refs:
            return !onListingPage;
        case CivilMode.Memorise:
            return !onListingPage;
        case CivilMode.AddAbove:
            // don't show AddAbove option for quotes
            return !onListingPage && urlParts[1] !== "quotes";
        case CivilMode.BookmarkLinks:
            return true;
    }
}
