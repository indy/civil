import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckArticle,
    DeckIdea,
    DeckKind,
    DeckPerson,
    DeckPoint,
    DeckQuote,
    DeckTimeline,
    FlashCard,
    IDeckCore,
    Note,
    NoteKind,
    NoteSectionHowToShow,
    Notes,
    ProtoPoint,
    Ref,
    ToolbarMode,
} from "../types";

import Net from "../Net";
import { getAppState, AppStateChange } from "../AppState";
import { buildUrl, sortByResourceThenName } from "../CivilUtils";
import { NoteManager } from "./NoteSection";
import { PointForm } from "./PointForm";

type DeckManagerState = {
    deck: IDeckCore | undefined;
    isShowingUpdateForm: boolean;
    isEditingDeckRefs: boolean;
    canHaveSummarySection: boolean;
    canHaveReviewSection: boolean;
    displayShowSummaryButton: boolean;
    displayShowReviewButton: boolean;
};

function identity(a: IDeckCore): IDeckCore {
    return a;
}

type Props = {
    id: number;
    deckKind: DeckKind;
    preCacheFn?: (_: IDeckCore) => IDeckCore;
    hasSummarySection: boolean;
    hasReviewSection: boolean;
};

export default function DeckManager({
    id,
    deckKind,
    preCacheFn,
    hasSummarySection,
    hasReviewSection,
}: Props) {
    const preCacheFunction = preCacheFn || identity;
    const appState = getAppState();

    const [dms, setDms]: [DeckManagerState, any] = useState(
        cleanDeckManagerState()
    );

    useEffect(() => {
        // fetch deckKind from the server
        const url = buildUrl(deckKind, id, "/api");
        Net.get<IDeckCore>(url).then((deck) => {
            if (deck) {
                let newDms = dmsUpdateDeck(
                    dms,
                    preCacheFunction(deck),
                    deckKind,
                    true
                );
                newDms = dmsCanHaveSummarySection(newDms, hasSummarySection);
                newDms = dmsCanHaveReviewSection(newDms, hasReviewSection);
                setDms(newDms);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    function update(newDeck: IDeckCore) {
        let newDms = dmsUpdateDeck(
            dms,
            preCacheFunction(newDeck),
            deckKind,
            false
        );
        setDms(newDms);
    }
    function findNoteWithId(
        deck: IDeckCore,
        id: number,
        modifyFn: (n: Notes, idx: number) => void
    ) {
        const notes = deck.notes;
        const index = notes.findIndex((n) => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes };

        update(d);
    }

    function onRefsChanged(note: Note, allDecksForNote: Array<Ref>) {
        // guess
        // have to make a copy of note so that preact's
        // diff algorithm can pick up the change
        //
        let n = { ...note };

        if (dms.deck) {
            let deck: IDeckCore = dms.deck;

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
        isShowingUpdateForm: function () {
            return dms.isShowingUpdateForm;
        },
        isEditingDeckRefs: function () {
            return dms.isEditingDeckRefs;
        },
        updateAndReset: function (newDeck: IDeckCore) {
            let newDms = dmsUpdateDeck(
                dms,
                preCacheFunction(newDeck),
                deckKind,
                true
            );
            newDms = dmsHideForm(newDms);
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
        onRefsToggle: function () {
            let newDms = dmsRefsToggle(dms);
            setDms(newDms);
        },
        onFormToggle: function () {
            let newDms = dmsUpdateFormToggle(dms);
            setDms(newDms);
        },
        buildPointForm: function (onSuccessCallback: () => void) {
            // currently only people and timelines have these endpoints
            //
            function onAddPoint(point: ProtoPoint) {
                if (dms.deck) {
                    const url =
                        buildUrl(deckKind, dms.deck.id, "/api") + "/points";
                    Net.post<ProtoPoint, IDeckCore>(url, point).then(
                        (updatedDeck) => {
                            update(updatedDeck);
                            onSuccessCallback();
                        }
                    );
                }
            }
            function onAddPoints(points: Array<ProtoPoint>) {
                if (dms.deck) {
                    const url =
                        buildUrl(deckKind, dms.deck.id, "/api") +
                        "/multipoints";
                    Net.post<Array<ProtoPoint>, IDeckCore>(url, points).then(
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
        noteManagerForDeckPoint: function (deckPoint: DeckPoint) {
            if (dms.deck) {
                let deck: IDeckCore = dms.deck;
                if (deck && deck.noteSeqs && deck.noteSeqs.points) {
                    return NoteManager({
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
        canShowNoteSection: function (noteKind: NoteKind) {
            if (
                noteKind === NoteKind.NoteSummary &&
                dms.canHaveSummarySection
            ) {
                return true;
            }
            if (noteKind === NoteKind.NoteReview && dms.canHaveReviewSection) {
                return true;
            }
            if (noteKind === NoteKind.Note) {
                return true;
            }
            return false;
        },
        howToShowNoteSection: function (
            noteKind: NoteKind
        ): NoteSectionHowToShow {
            if (noteKind === NoteKind.NoteSummary) {
                if (dms.canHaveSummarySection) {
                    return dms.displayShowSummaryButton
                        ? NoteSectionHowToShow.Hide
                        : NoteSectionHowToShow.Show;
                } else {
                    return NoteSectionHowToShow.Hide;
                }
            }

            if (noteKind === NoteKind.NoteReview) {
                if (dms.canHaveReviewSection) {
                    return dms.displayShowReviewButton
                        ? NoteSectionHowToShow.Hide
                        : NoteSectionHowToShow.Show;
                } else {
                    return NoteSectionHowToShow.Hide;
                }
            }

            if (noteKind === NoteKind.Note) {
                var r = NoteSectionHowToShow.Exclusive;
                if (
                    dms.canHaveSummarySection &&
                    !dms.displayShowSummaryButton
                ) {
                    r = NoteSectionHowToShow.Show;
                }
                if (dms.canHaveReviewSection && !dms.displayShowReviewButton) {
                    r = NoteSectionHowToShow.Show;
                }
                return r;
            }

            return NoteSectionHowToShow.Hide;
        },
    };

    return res;
}

function cleanDeckManagerState(): DeckManagerState {
    let res: DeckManagerState = {
        deck: undefined,
        isShowingUpdateForm: false,
        isEditingDeckRefs: false,
        canHaveSummarySection: false,
        canHaveReviewSection: false,
        displayShowSummaryButton: false,
        displayShowReviewButton: false,
    };
    return res;
}

function dmsUpdateDeck(
    dms: DeckManagerState,
    deck: IDeckCore,
    deckKind: DeckKind,
    scrollToTop: boolean
): DeckManagerState {
    // modify the notes received from the server
    applyDecksAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);

    let urlName = "";

    switch (deckKind) {
        case DeckKind.Person:
            urlName = (deck as DeckPerson).name;
            break;
        case DeckKind.Idea:
            urlName = (deck as DeckIdea).title;
            break;
        case DeckKind.Article:
            urlName = (deck as DeckArticle).title;
            break;
        case DeckKind.Timeline:
            urlName = (deck as DeckTimeline).title;
            break;
        case DeckKind.Quote:
            urlName = (deck as DeckQuote).title;
            break;
    }

    AppStateChange.urlName(urlName);
    AppStateChange.routeChanged(buildUrl(deckKind, deck.id));

    let res: DeckManagerState = { ...dms };
    res.deck = deck;

    if (scrollToTop) {
        window.scrollTo(0, 0);
    }

    return res;
}

function dmsShowSummaryButtonToggle(
    dms: DeckManagerState,
    isToggled: boolean
): DeckManagerState {
    let res = {
        ...dms,
        displayShowSummaryButton: isToggled,
        isShowingUpdateForm: false,
    };
    return res;
}

function dmsShowReviewButtonToggle(
    dms: DeckManagerState,
    isToggled: boolean
): DeckManagerState {
    let res = {
        ...dms,
        displayShowReviewButton: isToggled,
        isShowingUpdateForm: false,
    };
    return res;
}

function dmsCanHaveSummarySection(
    dms: DeckManagerState,
    canHave: boolean
): DeckManagerState {
    let res = { ...dms };

    res.canHaveSummarySection = canHave;
    if (res.deck && canHave) {
        res.displayShowSummaryButton = !res.deck.notes.some(
            (n) => n.kind === NoteKind.NoteSummary
        );
    }

    return res;
}

function dmsCanHaveReviewSection(
    dms: DeckManagerState,
    canHave: boolean
): DeckManagerState {
    let res = { ...dms };

    res.canHaveReviewSection = canHave;

    if (res.deck && canHave) {
        res.displayShowReviewButton = !res.deck.notes.some(
            (n) => n.kind === NoteKind.NoteReview
        );
    }

    return res;
}

function dmsUpdateFormToggle(dms: DeckManagerState): DeckManagerState {
    let res = { ...dms };
    res.isShowingUpdateForm = !res.isShowingUpdateForm;

    return res;
}

function dmsRefsToggle(dms: DeckManagerState): DeckManagerState {
    let res = { ...dms };
    res.isEditingDeckRefs = !res.isEditingDeckRefs;

    return res;
}

function dmsHideForm(dms: DeckManagerState): DeckManagerState {
    let res = {
        ...dms,
        isShowingUpdateForm: false,
    };
    return res;
}

function applyDecksAndCardsToNotes(deck: IDeckCore) {
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

function hashByNoteIds(s: Array<Ref | FlashCard>) {
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

function buildNoteSeqs(deck: IDeckCore) {
    // build NoteSeqs for notes associated with points
    let points: { [id: number]: Notes } = noteSeqsForPoints(deck.notes);
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

function noteSeqsForPoints(notes: Notes): { [id: number]: Notes } {
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

function noteSeq(notes: Notes, kind: NoteKind): Notes {
    let ns = notes.filter((n) => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createSeq(ns);
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
