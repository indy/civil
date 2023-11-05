import type { SearchResults } from "../types";

export function sanitize(text: string): string {
    let blocked = [
        "?",
        ">",
        "<",
        "+",
        "-",
        "/",
        "*",
        "%",
        "!",
        "(",
        ")",
        ",",
        ".",
        ":",
        "`",
        "\\",
        "'",
    ];
    return blocked.reduce((a, b) => a.replaceAll(b, ""), text);
}

export function emptySearchResults(): SearchResults {
    const res: SearchResults = {
        searchText: "",
        deckLevel: [],
        noteLevel: [],
    };

    return res;
}
