import { Key, Notes, NoteKind, Note } from "types";

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
