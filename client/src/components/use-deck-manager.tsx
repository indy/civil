import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    Arrival,
    CivilMode,
    DeckKind,
    FatDeck,
    Key,
    Note,
    NoteKind,
    Notes,
    Passage,
    PassageHowToShow,
    Point,
    ProtoPoint,
    Reference,
} from "types";

import { AppStateChange, getAppState } from "app-state";

import { bitset } from "shared/bitops";
import { buildUrl } from "shared/civil";
import { sortByDeckKindThenName } from "shared/deck";
import Net from "shared/net";
import {
    createMultiplePassages,
    noteSeqsForPoints,
    passageForNoteKind,
} from "shared/passage";

import PointForm from "components/point-form";
import ViewPassageChunkyBoy from "components/view-passage-chunky-boy";

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

    function onRefsChanged(note: Note, refsInNote: Array<Reference>) {
        if (dms.deck) {
            let deck: T = dms.deck;

            note.refs = refsInNote;
            note.refs.sort(sortByDeckKindThenName);

            let n = { ...note };

            findNoteWithId(deck, n.id, (notes: Notes, index: number) => {
                notes[index] = n;
            });
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

            if (appState.wantToShowDeckUpdateForm.value && !value) {
                AppStateChange.requestToHideUpdateForm();
            } else if (!appState.wantToShowDeckUpdateForm.value && value) {
                AppStateChange.requestToShowUpdateForm();
            }
        },
        complyWithAppStateRequestToShowUpdateForm: function () {
            if (
                appState.wantToShowDeckUpdateForm.value &&
                !dms.isShowingUpdateForm
            ) {
                // app state wants to show deck metadata, but currently isn't doing so
                let newDms = dmsSetShowingUpdateForm(dms, true);
                setDms(newDms);
            } else if (
                !appState.wantToShowDeckUpdateForm.value &&
                dms.isShowingUpdateForm
            ) {
                let newDms = dmsSetShowingUpdateForm(dms, false);
                setDms(newDms);
            }
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

            AppStateChange.requestToHideUpdateForm();
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
        passageForPoint: function (point: Point) {
            if (dms.deck) {
                let deck: FatDeck = dms.deck;
                // if (deck.notePassages.points) {
                if (deck.passageForPoint) {
                    return ViewPassageChunkyBoy({
                        deck: deck,
                        notes: deck.passageForPoint[point.id],
                        onUpdateDeck: update,
                        onRefsChanged,
                        optionalPoint: point,
                        appendLabel: `Append Note to ${point.title}`,
                        noteKind: NoteKind.Note,
                        extraClasses: "passage-for-point",
                    });
                }
            }
            return "FAKE";
        },
        pointHasNotes: function (point: Point) {
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
    deck = sortRefsInNotes(deck);
    // organise the notes into noteSeqs
    deck = buildNotePassages(deck);
    // build passages for the arrivals and then partition them by deck kind
    deck = buildArrivalPassages(deck);
    deck = buildGroupedArrivals(deck);

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

function sortRefsInNotes<T extends FatDeck>(deck: T): T {
    for (let i = 0; i < deck.notes.length; i++) {
        let n = deck.notes[i];
        if (n.refs.length > 0) {
            n.refs.sort(sortByDeckKindThenName);
        }
    }
    return deck;
}

function buildNotePassages<T extends FatDeck>(deck: T): T {
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
    let note: Notes = passageForNoteKind(deck.notes, NoteKind.Note);
    let noteDeckMeta: Notes = passageForNoteKind(
        deck.notes,
        NoteKind.NoteDeckMeta
    ); // should only be of length 1
    let noteReview: Notes = passageForNoteKind(deck.notes, NoteKind.NoteReview);
    let noteSummary: Notes = passageForNoteKind(
        deck.notes,
        NoteKind.NoteSummary
    );

    if (noteDeckMeta.length !== 1) {
        console.error(
            `deck: ${deck.id} has a NoteDeckMeta noteseq of length: ${noteDeckMeta.length} ???`
        );
    }

    let notePassagesGroupedByNoteKind: Record<NoteKind, Passage> = {
        [NoteKind.Note]: note,
        [NoteKind.NoteSummary]: noteSummary,
        [NoteKind.NoteReview]: noteReview,
        [NoteKind.NoteDeckMeta]: noteDeckMeta,
    };

    deck.passage = notePassagesGroupedByNoteKind;
    deck.passageForPoint = points;

    return deck;
}

function buildArrivalPassages<T extends FatDeck>(deck: T): T {
    deck.arrivals.forEach((arrival) => {
        arrival.passages = createMultiplePassages(arrival.notes);
    });

    return deck;
}

function buildGroupedArrivals<T extends FatDeck>(deck: T): T {
    let groupedByDeckKind: Record<DeckKind, Array<Arrival>> = {
        [DeckKind.Article]: [],
        [DeckKind.Person]: [],
        [DeckKind.Idea]: [],
        [DeckKind.Timeline]: [],
        [DeckKind.Quote]: [],
        [DeckKind.Dialogue]: [],
        [DeckKind.Event]: [],
    };

    deck.arrivals.forEach((bn: Arrival) => {
        groupedByDeckKind[bn.deck.deckKind].push(bn);
    });

    deck.groupedArrivals = groupedByDeckKind;

    return deck;
}
