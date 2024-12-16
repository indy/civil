import { DeckKind } from "../enums";

import { deckKindToResourceString, stringToDeckKind } from "./deck";

export function getUrlParamNumber(key: string, defaultValue: number): number {
    const v = getUrlParam(key);
    const val = v ? parseInt(v, 10) : defaultValue;

    return val;
}

export function getUrlParamString(key: string, defaultValue: string): string {
    const v = getUrlParam(key);
    const val = v ? v : defaultValue;

    return val;
}

export function getUrlParamDeckKind(): DeckKind {
    const deckKindString = getUrlParam("deck-kind");
    const res = stringToDeckKind(deckKindString);

    return res;
}

export function setUrlParamDeckKind(dk: DeckKind) {
    setUrlParam("deck-kind", deckKindToResourceString(dk));
}

function getUrlParam(name: string): string | null {
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);

    const value = params.get(name);

    return value;
}

export function setUrlParam(name: string, value: string) {
    const params = new URLSearchParams(window.location.search);

    params.set(name, value);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}
