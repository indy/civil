import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    BackNote,
    BackRefDeck,
    CivilMode,
    DeckKind,
    DeckPoint,
    FatDeck,
    FlashCard,
    Key,
    Note,
    NoteKind,
    BackRefNote,
    Notes,
    PassageHowToShow,
    ProtoPoint,
    Reference,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import Passage from "components/passage";

import PointForm from "components/point-form";

import { bitset } from "shared/bitops";
import { noteSeq, noteSeqsForPoints } from "shared/seq";
import { sortByDeckKindThenName } from "shared/deck";
import { buildUrl, nonEmptyArray } from "shared/civil";
import Net from "shared/net";

type DeckManagerState<T extends FatDeck> = {
    deck: T | undefined;
    isShowingUpdateForm: boolean;
    isEditingDeckRefs: boolean;
    canHaveSummaryPassage: boolean;
    canHaveReviewPassage: boolean;
    displayShowSummaryButton: boolean;
    displayShowReviewButton: boolean;
};

function identity<T extends FatDeck>(a: T): T {
    return a;
}

export default function useDeckManager<T extends FatDeck>(
    id: string | undefined,
    deckKind: DeckKind,
    flags?: number,
    preCacheFn?: (_: T) => T
) {
    const preCacheFunction = preCacheFn || identity;
    const appState = getAppState();

    const [dms, setDms]: [DeckManagerState<T>, Function] = useState(
        cleanDeckManagerState<T>()
    );

    useEffect(() => {
        if (id) {
            const deckId = parseInt(id, 10);

            // fetch deckKind from the server
            const url = buildUrl(deckKind, deckId, "/api");
            Net.get<T>(url).then((deck) => {
                // console.log(deck);
                if (deck) {
                    let newDms = dmsUpdateDeck<T>(
                        dms,
                        preCacheFunction(deck),
                        deckKind
                    );

                    window.scrollTo(0, 0);

                    let hasSummaryPassage = bitset(flags || 0, 1);
                    let hasReviewPassage = bitset(flags || 0, 2);

                    newDms = dmsCanHaveSummaryPassage(
                        newDms,
                        hasSummaryPassage
                    );
                    newDms = dmsCanHaveReviewPassage(newDms, hasReviewPassage);
                    setDms(newDms);
                } else {
                    console.error(`error: fetchDeck for ${url}`);
                }
            });
        }
    }, [id]);

    function update(newDeck: T) {
        let newDms = dmsUpdateDeck<T>(dms, preCacheFunction(newDeck), deckKind);
        setDms(newDms);
    }
    function findNoteWithId(
        deck: T,
        id: Key,
        modifyFn: (n: Notes, idx: number) => void
    ) {
        const notes = deck.notes;
        const index = notes.findIndex((n) => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes };

        update(d);
    }

    function onRefsChanged(note: Note, allDecksForNote: Array<Reference>) {
        let n = { ...note };

        if (dms.deck) {
            let deck: T = dms.deck;

            // have to set deck.refs to be the canonical version
            // (used to populate each note's decks array)

            if (deck.refs) {
                // remove all deck.refs that relate to this note
                deck.refs = deck.refs.filter((din) => {
                    return din.noteId !== n.id;
                });
                // add every note.decks entry to deck.refs
                allDecksForNote.forEach((d) => {
                    // exclamation to please the compiler, even though checks ensure that refs will not be undefined
                    deck.refs!.push(d);
                });
            }

            findNoteWithId(deck, n.id, (notes: Notes, index: number) => {
                notes[index] = n;
            });

            update(deck);
        }
    }

    let res = {
        update,
        getDeck: function () {
            return dms.deck;
        },
        getDeckKind: function () {
            return deckKind;
        },
        isShowingUpdateForm: function () {
            return dms.isShowingUpdateForm;
        },
        setShowingUpdateForm: function (value: boolean) {
            let newDms = dmsSetShowingUpdateForm(dms, value);
            setDms(newDms);
        },
        isEditingDeckRefs: function () {
            return dms.isEditingDeckRefs;
        },
        setEditingDeckRefs: function (value: boolean) {
            let newDms = dmsSetEditingDeckRefs(dms, value);
            setDms(newDms);
        },
        updateAndReset: function (newDeck: T) {
            let newDms = dmsUpdateDeck<T>(
                dms,
                preCacheFunction(newDeck),
                deckKind
            );

            window.scrollTo(0, 0);

            newDms = dmsSetShowingUpdateForm(newDms, false);

            AppStateChange.mode({ mode: CivilMode.View });

            setDms(newDms);
        },
        onShowSummaryClicked: function () {
            let newDms = dmsShowSummaryButtonToggle(
                dms,
                !dms.displayShowSummaryButton
            );
            setDms(newDms);
        },
        onShowReviewClicked: function () {
            let newDms = dmsShowReviewButtonToggle(
                dms,
                !dms.displayShowReviewButton
            );
            setDms(newDms);
        },
        buildPointForm: function (onSuccessCallback: () => void) {
            // currently only people and timelines have these endpoints
            //
            function onAddPoint(point: ProtoPoint) {
                if (dms.deck) {
                    const url =
                        buildUrl(deckKind, dms.deck.id, "/api") + "/points";
                    Net.post<ProtoPoint, T>(url, point).then((updatedDeck) => {
                        update(updatedDeck);
                        onSuccessCallback();
                    });
                }
            }
            function onAddPoints(points: Array<ProtoPoint>) {
                if (dms.deck) {
                    const url =
                        buildUrl(deckKind, dms.deck.id, "/api") +
                        "/multipoints";
                    Net.post<Array<ProtoPoint>, T>(url, points).then(
                        (updatedDeck) => {
                            update(updatedDeck);
                            onSuccessCallback();
                        }
                    );
                }
            }

            return (
                <PointForm
                    onSubmit={onAddPoint}
                    submitMessage="Create Point"
                    onSubmitMultiplePoints={onAddPoints}
                />
            );
        },
        onRefsChanged,
        passageForDeckPoint: function (deckPoint: DeckPoint) {
            if (dms.deck) {
                let deck: FatDeck = dms.deck;
                if (deck && deck.noteSeqs && deck.noteSeqs.points) {
                    return Passage({
                        deck: deck,
                        mode: appState.mode.value,
                        notes: deck.noteSeqs.points[deckPoint.id],
                        onUpdateDeck: update,
                        onRefsChanged,
                        optionalDeckPoint: deckPoint,
                        appendLabel: `Append Note to ${deckPoint.title}`,
                        noteKind: NoteKind.Note,
                        extraClasses: "passage-for-deckpoint"
                    });
                }
            }
            return "FAKE";
        },
        pointHasNotes: function (point: DeckPoint) {
            if (dms.deck) {
                return dms.deck.notes.some((n) => n.pointId === point.id);
            } else {
                return false;
            }
        },
        canShowPassage: function (noteKind: NoteKind) {
            if (
                noteKind === NoteKind.NoteSummary &&
                dms.canHaveSummaryPassage
            ) {
                return true;
            }
            if (noteKind === NoteKind.NoteReview && dms.canHaveReviewPassage) {
                return true;
            }
            if (noteKind === NoteKind.Note) {
                return true;
            }
            return false;
        },
        howToShowPassage: function (noteKind: NoteKind): PassageHowToShow {
            if (noteKind === NoteKind.NoteSummary) {
                if (dms.canHaveSummaryPassage) {
                    return dms.displayShowSummaryButton
                        ? PassageHowToShow.Hide
                        : PassageHowToShow.Show;
                } else {
                    return PassageHowToShow.Hide;
                }
            }

            if (noteKind === NoteKind.NoteReview) {
                if (dms.canHaveReviewPassage) {
                    return dms.displayShowReviewButton
                        ? PassageHowToShow.Hide
                        : PassageHowToShow.Show;
                } else {
                    return PassageHowToShow.Hide;
                }
            }

            if (noteKind === NoteKind.Note) {
                var r = PassageHowToShow.Exclusive;
                if (
                    dms.canHaveSummaryPassage &&
                    !dms.displayShowSummaryButton
                ) {
                    r = PassageHowToShow.Show;
                }
                if (dms.canHaveReviewPassage && !dms.displayShowReviewButton) {
                    r = PassageHowToShow.Show;
                }
                return r;
            }

            return PassageHowToShow.Hide;
        },
    };

    return res;
}

function cleanDeckManagerState<T extends FatDeck>(): DeckManagerState<T> {
    let res: DeckManagerState<T> = {
        deck: undefined,
        isShowingUpdateForm: false,
        isEditingDeckRefs: false,
        canHaveSummaryPassage: false,
        canHaveReviewPassage: false,
        displayShowSummaryButton: false,
        displayShowReviewButton: false,
    };
    return res;
}

function dmsUpdateDeck<T extends FatDeck>(
    dms: DeckManagerState<T>,
    deck: T,
    deckKind: DeckKind
): DeckManagerState<T> {
    // modify the notes received from the server
    applyRefsAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);
    // sort the backnotes into sequences
    buildBackRefsGroupedByResource(deck);

    AppStateChange.urlTitle({ title: deck.title });
    AppStateChange.routeChanged({ url: buildUrl(deckKind, deck.id) });

    let res: DeckManagerState<T> = { ...dms };
    res.deck = deck;

    return res;
}

function dmsShowSummaryButtonToggle<T extends FatDeck>(
    dms: DeckManagerState<T>,
    isToggled: boolean
): DeckManagerState<T> {
    let res = {
        ...dms,
        displayShowSummaryButton: isToggled,
        isShowingUpdateForm: false,
    };
    return res;
}

function dmsShowReviewButtonToggle<T extends FatDeck>(
    dms: DeckManagerState<T>,
    isToggled: boolean
): DeckManagerState<T> {
    let res = {
        ...dms,
        displayShowReviewButton: isToggled,
        isShowingUpdateForm: false,
    };
    return res;
}

function dmsCanHaveSummaryPassage<T extends FatDeck>(
    dms: DeckManagerState<T>,
    canHave: boolean
): DeckManagerState<T> {
    let res = { ...dms };

    res.canHaveSummaryPassage = canHave;
    if (res.deck && canHave) {
        res.displayShowSummaryButton = !res.deck.notes.some(
            (n) => n.kind === NoteKind.NoteSummary
        );
    }

    return res;
}

function dmsCanHaveReviewPassage<T extends FatDeck>(
    dms: DeckManagerState<T>,
    canHave: boolean
): DeckManagerState<T> {
    let res = { ...dms };

    res.canHaveReviewPassage = canHave;

    if (res.deck && canHave) {
        res.displayShowReviewButton = !res.deck.notes.some(
            (n) => n.kind === NoteKind.NoteReview
        );
    }

    return res;
}

function dmsSetShowingUpdateForm<T extends FatDeck>(
    dms: DeckManagerState<T>,
    value: boolean
): DeckManagerState<T> {
    let res = { ...dms };
    res.isShowingUpdateForm = value;

    return res;
}

function dmsSetEditingDeckRefs<T extends FatDeck>(
    dms: DeckManagerState<T>,
    value: boolean
): DeckManagerState<T> {
    let res = { ...dms };
    res.isEditingDeckRefs = value;

    return res;
}

function applyRefsAndCardsToNotes<T extends FatDeck>(deck: T) {
    if (deck.notes) {
        if (deck.refs) {
            const refsInNotes = hashByNoteIds(deck.refs);
            for (let i = 0; i < deck.notes.length; i++) {
                let n = deck.notes[i];
                n.refs = refsInNotes[n.id] || [];
                if (n.refs) {
                    n.refs.sort(sortByDeckKindThenName);
                }
            }
        }

        if (deck.flashcards) {
            const cardsInNotes = hashByNoteIds(deck.flashcards);
            for (let i = 0; i < deck.notes.length; i++) {
                let n = deck.notes[i];
                if (cardsInNotes[n.id]) {
                    n.flashcards = cardsInNotes[n.id];
                } else {
                    n.flashcards = [];
                }
            }
        }
    }

    return deck;
}

function hashByNoteIds(s: Array<Reference | FlashCard>) {
    let res = {};

    s = s || [];
    s.forEach((n) => {
        const noteId = n.noteId;
        if (noteId) {
            if (!res[noteId]) {
                res[noteId] = [];
            }
            res[noteId].push(n);
        }
    });

    return res;
}

function buildNoteSeqs<T extends FatDeck>(deck: T) {
    // build NoteSeqs for notes associated with points
    let points: { [id: Key]: Notes } = noteSeqsForPoints(deck.notes);
    // add empty noteSeqs for points without any notes
    if (deck.points) {
        deck.points.forEach((p) => {
            if (!points[p.id]) {
                points[p.id] = [];
            }
        });
    }

    // build NoteSeqs for all other note kinds
    let note: Notes = noteSeq(deck.notes, NoteKind.Note);
    let noteDeckMeta: Notes = noteSeq(deck.notes, NoteKind.NoteDeckMeta); // should only be of length 1
    let noteReview: Notes = noteSeq(deck.notes, NoteKind.NoteReview);
    let noteSummary: Notes = noteSeq(deck.notes, NoteKind.NoteSummary);

    if (noteDeckMeta.length !== 1) {
        console.error(
            `deck: ${deck.id} has a NoteDeckMeta noteseq of length: ${noteDeckMeta.length} ???`
        );
    }

    deck.noteSeqs = {
        points,
        note,
        noteDeckMeta,
        noteReview,
        noteSummary,
    };

    return deck;
}

function indexOfNoteId(noteId: Key, notes: Array<BackRefNote>): number {
    return notes.findIndex((n) => n.noteId === noteId);
}
function indexOfPrevNoteId(prevNoteId: Key, notes: Array<BackRefNote>): number {
    return notes.findIndex((n) => n.prevNoteId && n.prevNoteId === prevNoteId);
}

function buildBackRefNoteSeq(
    head: BackRefNote,
    rem: Array<BackRefNote>
): Array<BackRefNote> {
    let res: Array<BackRefNote> = [head];

    // search leftwards
    //
    while (res[0].prevNoteId) {
        let idx = indexOfNoteId(res[0].prevNoteId, rem);
        if (idx >= 0) {
            // remove the indexed item from rem and prefix it to res
            let item = rem.splice(idx, 1)[0];
            res.unshift(item);
        } else {
            // can stop looping
            break;
        }
    }

    // search rightwards
    //
    while (true) {
        let idx = indexOfPrevNoteId(res[res.length - 1].noteId, rem);
        if (idx >= 0) {
            // remove the indexed item from rem and prefix it to res
            let item = rem.splice(idx, 1)[0];
            res.push(item);
        } else {
            // can stop looping
            break;
        }
    }

    return res;
}

function buildBackRefNoteSeqs(
    notes: Array<BackRefNote>
): Array<Array<BackRefNote>> {
    const maxLoops = notes.length;
    let numLoops = 0;

    let res: Array<Array<BackRefNote>> = [];

    // will mutate notes
    while (notes.length > 0) {
        let head: BackRefNote = notes.splice(0, 1)[0];
        res.push(buildBackRefNoteSeq(head, notes));

        numLoops += 1;
        if (numLoops > maxLoops) {
            console.error("too many loops, should never get here");
            return res;
        }
    }
    return res;
}

function buildBackRefsGroupedByResource<T extends FatDeck>(deck: T) {
    let backrefs: Array<Reference> = deck.backrefs || [];
    let backnotes: Array<BackNote> = deck.backnotes || [];

    const backRefDecks: Array<BackRefDeck> = [];
    // key = deck id, value = array of notes
    const brNote = {};

    if (!nonEmptyArray<Reference>(backrefs)) {
        return undefined;
    }

    // file into backRefDecks with notes
    //
    backnotes.forEach((n: BackNote) => {
        if (
            backRefDecks.length === 0 ||
            backRefDecks[backRefDecks.length - 1].deckId !== n.id
        ) {
            let backRefItem: BackRefDeck = {
                deckId: n.id,
                title: n.title,
                deckInsignia: n.insignia,
                deckFont: n.font,
                deckKind: n.deckKind,
                backRefNoteSeqs: [],
                deckLevelRefs: [],
                metaNoteId: 0,
            };
            backRefDecks.push(backRefItem);
            brNote[n.id] = [];
        }

        if (n.noteKind === NoteKind.NoteDeckMeta) {
            // all refs associated with the NoteDeckMeta note id are rendered differently
            backRefDecks[backRefDecks.length - 1].metaNoteId = n.noteId;
        } else {
            let noteThing: BackRefNote = {
                noteContent: n.noteContent,
                font: n.noteFont,
                noteId: n.noteId,
                prevNoteId: n.prevNoteId,
                refs: [],
            };
            brNote[n.id].push(noteThing);
        }
    });

    backRefDecks.forEach((bri) => {
        bri.backRefNoteSeqs = buildBackRefNoteSeqs(brNote[bri.deckId]);
    });

    // attach refs to the correct notes
    //
    backrefs.forEach((br: Reference) => {
        // find the noteId
        for (let i = 0; i < backRefDecks.length; i++) {
            let d: BackRefDeck = backRefDecks[i];

            if (d.metaNoteId === br.noteId) {
                if (br.id === deck.id) {
                    d.deckLevelAnnotation = br.annotation;
                } else {
                    let ref: Reference = {
                        noteId: br.noteId,
                        id: br.id,
                        title: br.title,
                        refKind: br.refKind,
                        deckKind: br.deckKind,
                        annotation: br.annotation,
                        insignia: br.insignia,
                        font: br.font,
                    };
                    d.deckLevelRefs.push(ref);
                    break;
                }
            } else {
                let breakout = false;

                for (let k = 0; k < d.backRefNoteSeqs.length; k++) {
                    breakout = false;

                    for (let j = 0; j < d.backRefNoteSeqs[k].length; j++) {
                        if (d.backRefNoteSeqs[k][j].noteId === br.noteId) {
                            if (br.id === deck.id) {
                                d.backRefNoteSeqs[k][j].topRefKind = br.refKind;
                                d.backRefNoteSeqs[k][j].topAnnotation =
                                    br.annotation;
                            } else {
                                let ref: Reference = {
                                    noteId: br.noteId,
                                    id: br.id,
                                    title: br.title,
                                    refKind: br.refKind,
                                    deckKind: br.deckKind,
                                    annotation: br.annotation,
                                    insignia: br.insignia,
                                    font: br.font,
                                };
                                d.backRefNoteSeqs[k][j].refs.push(ref);
                            }
                            breakout = true;
                            break;
                        }
                    }
                    if (breakout) {
                        break;
                    }
                }
            }
        }
    });

    // sort all of the refs
    //
    backRefDecks.forEach((d: BackRefDeck) => {
        d.deckLevelRefs.sort(sortByDeckKindThenName);

        d.backRefNoteSeqs.forEach((seq: Array<BackRefNote>) => {
            seq.forEach((brn: BackRefNote) => {
                brn.refs.sort(sortByDeckKindThenName);
            });
        });
    });

    // group by deckKind kind
    //
    let groupedByDeckKind: Record<DeckKind, Array<BackRefDeck>> = {
        [DeckKind.Article]: [],
        [DeckKind.Person]: [],
        [DeckKind.Idea]: [],
        [DeckKind.Timeline]: [],
        [DeckKind.Quote]: [],
        [DeckKind.Dialogue]: [],
    };

    backRefDecks.forEach((d: BackRefDeck) => {
        if (!groupedByDeckKind[d.deckKind]) {
            groupedByDeckKind[d.deckKind] = [];
        }
        if (d.metaNoteId) {
            // deck-level back refs should be given priority
            // add them to the front of the array
            groupedByDeckKind[d.deckKind].unshift(d);
        } else {
            // normal per-note back refs are added to the end
            groupedByDeckKind[d.deckKind].push(d);
        }
    });

    // don't use the messy auto-generated quote titles
    // just name them after the deck id
    if (groupedByDeckKind[DeckKind.Quote]) {
        groupedByDeckKind[DeckKind.Quote].forEach((d: BackRefDeck) => {
            d.title = `Quote #${d.deckId}`;
        });
    }

    deck.backRefDecksGroupedByKind = groupedByDeckKind;

    return deck;
}
