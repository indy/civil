import { route } from "preact-router";

import {
    PeopleListings,
    IdeasListings,
    ArticleListings,
    DeckKind,
    Key,
    Font,
    SlimDeck,
} from "types";

import Net from "shared/net";

import { AppStateChange, immutableState } from "app-state";
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

    type AnyDeckListing =
        | IdeasListings
        | PeopleListings
        | ArticleListings
        | Array<SlimDeck>;

    Net.post<ProtoDeck, SlimDeck>(`/api/${resource}`, data).then((deck) => {
        Net.get<AnyDeckListing>(`/api/${resource}/listings`).then((listing) => {
            AppStateChange.deckCreated({
                deckKind,
            });

            switch (deckKind) {
                case DeckKind.Idea:
                    AppStateChange.setIdeaListings({
                        ideaListings: listing as IdeasListings,
                    });
                    break;
                case DeckKind.Person:
                    AppStateChange.setPeopleListings({
                        peopleListings: listing as PeopleListings,
                    });
                    break;
                case DeckKind.Article:
                    AppStateChange.setArticleListings({
                        articleListings: listing as ArticleListings,
                    });
                    break;
                case DeckKind.Timeline:
                    AppStateChange.setTimelineListings({
                        timelineListings: listing as Array<SlimDeck>,
                    });
                    break;
                case DeckKind.Event:
                    AppStateChange.setEventListings({
                        eventListings: listing as Array<SlimDeck>,
                    });
                    break;
            }
            AppStateChange.invalidateGraph();
        });
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
