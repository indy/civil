import {
    DeckKind,
    Key,
    SlimDeck,
    ToolbarMode,
    Notes,
    NoteKind,
    Note,
} from "types";

import { capitalise } from "utils/js";

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

export function addToolbarSelectableClasses(toolbarMode: ToolbarMode) {
    switch (toolbarMode) {
        case ToolbarMode.Edit:
            return " selectable-hovering selectable-hovering-edit";
        case ToolbarMode.Refs:
            return " selectable-hovering selectable-hovering-refs";
        case ToolbarMode.SR:
            return " selectable-hovering selectable-hovering-sr";
        case ToolbarMode.AddAbove:
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
    };
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
