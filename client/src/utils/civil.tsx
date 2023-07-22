import { route } from "preact-router";

import {
    PeopleListings,
    IdeasListings,
    ArticleListings,
    DeckKind,
    Key,
    SlimDeck,
    CivilMode,
    Notes,
    NoteKind,
    Note,
} from "types";

import Net from "utils/net";
import { AppStateChange, immutableState } from "app-state";
import { capitalise } from "utils/js";

export function isCommand(text: string) {
    return text.length >= 1 && text[0] === ":";
}

export function noteSeq(notes: Notes, kind: NoteKind): Notes {
    let ns = notes.filter((n) => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createSeq(ns);
}

export function noteSeqsForPoints(notes: Notes): { [id: Key]: Notes } {
    let p = {};
    notes.forEach((n) => {
        if (n.pointId) {
            if (!p[n.pointId]) {
                p[n.pointId] = [];
            }
            p[n.pointId].push(n);
        }
    });

    Object.keys(p).forEach((k) => {
        p[k] = createSeq(p[k]);
    });

    return p;
}

function createSeq(ns: Notes): Notes {
    let h: { [_: number]: Note } = {};
    let firstNote: Note | undefined;

    // key by prevNoteId
    //
    ns.forEach((n) => {
        if (n.prevNoteId) {
            h[n.prevNoteId] = n;
        } else {
            if (firstNote) {
                console.error(
                    "there is more than one note without a prev_note_id???"
                );
            }
            firstNote = n;
        }
    });

    let res: Notes = [];

    if (firstNote) {
        // create the ordered note seq to return
        let item: Note = firstNote;
        do {
            res.push(item);
            item = h[item.id];
        } while (item);
    } else {
        console.error("no firstNote found by createSeq");
    }

    return res;
}

export function buildUrl(deckKind: DeckKind, id: Key, prefix?: string): string {
    if (prefix) {
        return `${prefix}/${deckKindToResourceString(deckKind)}/${id}`;
    } else {
        return `/${deckKindToResourceString(deckKind)}/${id}`;
    }
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
    }
}

export function deckKindToHeadingString(deckKind: DeckKind): string {
    return capitalise(deckKindToResourceString(deckKind));
}

export function addToolbarSelectableClasses(mode: CivilMode) {
    switch (mode) {
        case CivilMode.Edit:
            return " selectable-hovering selectable-hovering-edit";
        case CivilMode.Refs:
            return " selectable-hovering selectable-hovering-refs";
        case CivilMode.Memorise:
            return " selectable-hovering selectable-hovering-memorise";
        case CivilMode.AddAbove:
            return " selectable-hovering selectable-hovering-add-above";
        default:
            return "";
    }
}

export function buildSlimDeck(
    deckKind: DeckKind,
    id: Key,
    title: string,
    insignia: number
): SlimDeck {
    return {
        id,
        title,
        deckKind,
        insignia,
        typeface: "serif",
    };
}

export function indexToShortcut(index: number) {
    if (index < 9) {
        return String.fromCharCode(index + 49);
    } else {
        return String.fromCharCode(index - 9 + 65).toLowerCase();
    }
}

function deckKindOrderValue(d: DeckKind): number {
    for (let i = 0; i < immutableState.deckKindOrder.length; i++) {
        if (immutableState.deckKindOrder[i] === d) {
            return i;
        }
    }

    return -1;
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
            switch (deckKind) {
                case DeckKind.Idea:
                    AppStateChange.setIdeaListings(listing as IdeasListings);
                    break;
                case DeckKind.Person:
                    AppStateChange.setPeopleListings(listing as PeopleListings);
                    break;
                case DeckKind.Article:
                    AppStateChange.setArticleListings(
                        listing as ArticleListings
                    );
                    break;
                case DeckKind.Timeline:
                    AppStateChange.setTimelineListings(
                        listing as Array<SlimDeck>
                    );
                    break;
            }
            AppStateChange.invalidateGraph();
        });
        route(`/${resource}/${deck.id}`);
    });
}
