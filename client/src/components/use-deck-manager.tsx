import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckPoint,
    FlashCard,
    FatDeck,
    Key,
    Note,
    NoteKind,
    PassageHowToShow,
    Notes,
    ProtoPoint,
    Reference,
    ToolbarMode,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import Passage from "components/notes/passage";

import PointForm from "components/point-form";

import { bitset } from "utils/bitops";
import {
    buildUrl,
    noteSeq,
    noteSeqsForPoints,
    sortByResourceThenName,
} from "utils/civil";
import Net from "utils/net";

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
                if (deck) {
                    let newDms = dmsUpdateDeck<T>(
                        dms,
                        preCacheFunction(deck),
                        deckKind,
                        true
                    );

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
        let newDms = dmsUpdateDeck<T>(
            dms,
            preCacheFunction(newDeck),
            deckKind,
            false
        );
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
        // guess
        // have to make a copy of note so that preact's
        // diff algorithm can pick up the change
        //
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
                deckKind,
                true
            );
            newDms = dmsSetShowingUpdateForm(newDms, false);

            AppStateChange.toolbarMode(ToolbarMode.View);

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
                        toolbarMode: appState.toolbarMode.value,
                        notes: deck.noteSeqs.points[deckPoint.id],
                        onUpdateDeck: update,
                        onRefsChanged,
                        optionalDeckPoint: deckPoint,
                        appendLabel: `Append Note to ${deckPoint.title}`,
                        noteKind: NoteKind.Note,
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
    deckKind: DeckKind,
    scrollToTop: boolean
): DeckManagerState<T> {
    // modify the notes received from the server
    applyDecksAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);

    AppStateChange.urlTitle(deck.title);
    AppStateChange.routeChanged(buildUrl(deckKind, deck.id));

    let res: DeckManagerState<T> = { ...dms };
    res.deck = deck;

    if (scrollToTop) {
        window.scrollTo(0, 0);
    }

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

function applyDecksAndCardsToNotes<T extends FatDeck>(deck: T) {
    if (deck.notes) {
        if (deck.refs) {
            const decksInNotes = hashByNoteIds(deck.refs);
            for (let i = 0; i < deck.notes.length; i++) {
                let n = deck.notes[i];
                n.decks = decksInNotes[n.id] || [];
                if (n.decks) {
                    n.decks.sort(sortByResourceThenName);
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
