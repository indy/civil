import { route } from "preact-router";

import { DeckKind, Key, Font, SlimDeck } from "types";

import Net from "shared/net";

import { immutableState } from "app-state";
import { capitalise } from "shared/english";

export function buildSlimDeck(
    deckKind: DeckKind,
    id: Key,
    title: string,
    insignia: number,
    font: Font
): SlimDeck {
    return {
        id,
        title,
        deckKind,
        graphTerminator: false,
        insignia,
        font,
    };
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
        route(`/${resource}/${deck.id}`);
    });
}

export function deckKindToSingularString(deckKind: DeckKind): string {
    switch (deckKind) {
        case DeckKind.Article:
            return "article";
        case DeckKind.Idea:
            return "idea";
        case DeckKind.Person:
            return "person";
        case DeckKind.Timeline:
            return "timeline";
        case DeckKind.Quote:
            return "quote";
        case DeckKind.Dialogue:
            return "dialogue";
        case DeckKind.Event:
            return "event";
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
        case DeckKind.Dialogue:
            return "dialogues";
        case DeckKind.Event:
            return "events";
    }
}

export function deckKindToHeadingString(deckKind: DeckKind): string {
    return capitalise(deckKindToResourceString(deckKind));
}

export function sortByDeckKindThenName(a: SlimDeck, b: SlimDeck): number {
    if (a.deckKind === b.deckKind) {
        let titleA = a.title.toUpperCase();
        let titleB = b.title.toUpperCase();
        if (titleA < titleB) {
            return -1;
        }

        if (titleA > titleB) {
            return 1;
        }
    } else {
        let dka = deckKindOrderValue(a.deckKind);
        let dkb = deckKindOrderValue(b.deckKind);
        if (dka < dkb) {
            return -1;
        }
        if (dka > dkb) {
            return 1;
        }
    }

    // titles must be equal
    return 0;
}

function deckKindOrderValue(d: DeckKind): number {
    for (let i = 0; i < immutableState.deckKindOrder.length; i++) {
        if (immutableState.deckKindOrder[i] === d) {
            return i;
        }
    }

    return -1;
}
