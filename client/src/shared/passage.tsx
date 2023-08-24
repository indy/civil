import { Key, Notes, Passage, NoteKind, Note } from "types";

export function passageForNoteKind(notes: Notes, kind: NoteKind): Passage {
    let ns = notes.filter((n) => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createOneCompletePassage(ns);
}

export function noteSeqsForPoints(notes: Notes): { [id: Key]: Passage } {
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
        p[k] = createOneCompletePassage(p[k]);
    });

    return p;
}

// assumes that the notes in ns represent one, complete passage
//
function createOneCompletePassage(ns: Notes): Passage {
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

    let res: Passage = [];

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

export function createMultiplePassages(ns: Notes): Array<Passage> {
    let h: { [_: number]: Note } = {};
    let firstNotes: Array<Note> = [];

    // key by prevNoteId
    //
    ns.forEach((n) => {
        if (n.prevNoteId) {
            h[n.prevNoteId] = n;
        } else {
            firstNotes.push(n);
        }
    });

    let res: Array<Passage> = [];

    // go through searching for any easy passages that have null prevNoteIds
    firstNotes.forEach((fn) => {
        let localRes = grabPassageStartingFrom(fn, h);
        res.push(localRes);
    });

    while (true) {
        let ks = Object.keys(h);
        if (ks.length > 0) {
            let startingNote = h[ks[0]];

            delete h[ks[0]];
            let localRes = grabPassageStartingFrom(startingNote, h);
            res.push(localRes);
        } else {
            break;
        }
    }

    // may need a final stage here where passages are fused together
    //
    // TODO

    return res;
}

function grabPassageStartingFrom(
    firstNote: Note,
    h: { [_: number]: Note }
): Passage {
    let item: Note = firstNote;
    let localRes: Passage = [];
    do {
        localRes.push(item);
        let id = item.id;
        item = h[id];
        delete h[id];
    } while (item);

    return localRes;
}

/*
function printPassage(label: string, passage: Passage) {
    if(isValidPassage(passage)) {
        console.log(`${label} is valid`);
        passage.forEach((n, i) => {
            console.log(`[${i}]  id: ${n.id}, prev: ${n.prevNoteId}`);
        });
    } else {
        console.error(`${label} is invalid`);
        passage.forEach((n, i) => {
            console.log(`[${i}]  id: ${n.id}, prev: ${n.prevNoteId}`);
        });
    }
}

function isValidPassage(passage: Passage): boolean {
    for (let i = 1; i < passage.length; i++) {
        let n = passage[i];
        if (n.prevNoteId !== passage[i-1].id) {
            console.error(`passage mismatch at index ${i}`);
            return false;
        }
    }
    return true;
}
*/
