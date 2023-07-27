import { DeckKind, Key } from "types";

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
