import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

// import { IIdeasListings, ISearchResults, IDeckSimple } from '../types';
import { ToolbarMode, NoteSectionHowToShow } from '../types';

import Net from '../Net';
import { getAppState, AppStateChange } from "../AppState";
import { sortByResourceThenName, deckTitle } from '../CivilUtils';

import { NoteManager,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW
       } from './NoteSection';

import { PointForm } from './PointForm';

function identity(a: any) {
    return a;
}

export default function DeckManager({ id, resource, preCacheFn, hasSummarySection, hasReviewSection }: { id?: any, resource?: any, preCacheFn?: any, hasSummarySection?: any, hasReviewSection?: any }) {
    const preCacheFunction = preCacheFn || identity;
    const appState = getAppState();

    const [dms, setDms] = useState(cleanDeckManagerState());

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                let newDms = dmsUpdateDeck(dms, preCacheFunction(deck), resource, true);
                newDms = dmsCanHaveSummarySection(newDms, hasSummarySection);
                newDms = dmsCanHaveReviewSection(newDms, hasReviewSection);
                setDms(newDms);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    function update(newDeck: any) {
        let newDms = dmsUpdateDeck(dms, preCacheFunction(newDeck), resource, false);
        setDms(newDms);
    }
    function findNoteWithId(deck: any, id: any, modifyFn: any) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};

        update(d);
    };

    function onRefsChanged(note: any, allDecksForNote: any) {
        // have to make a copy of note so that preact's
        // diff algorithm can pick up the change
        //
        let n = {...note};

        let deck: any = dms.deck;

        if (deck) {
            // have to set deck.refs to be the canonical version
            // (used to populate each note's decks array)

            // remove all deck.refs that relate to this note
            deck.refs = deck.refs.filter(din => {
                return din.noteId !== n.id;
            });
            // add every note.decks entry to deck.refs
            allDecksForNote.forEach(d => { deck.refs.push(d); });

            findNoteWithId(deck, n.id, (notes: any, index: any) => {
                notes[index] = n;
            });

            update(deck);
        }
    };

    let res = {
        update,
        getDeck: function() {
            return dms.deck;
        },
        isShowingUpdateForm: function() {
            return dms.isShowingUpdateForm;
        },
        isEditingDeckRefs: function() {
            return dms.isEditingDeckRefs;
        },
        updateAndReset: function(newDeck: any) {
            let newDms = dmsUpdateDeck(dms, preCacheFunction(newDeck), resource, true);
            newDms = dmsHideForm(newDms);
            AppStateChange.toolbarMode(ToolbarMode.View);

            setDms(newDms);
        },
        onShowSummaryClicked: function() {
            let newDms = dmsShowSummaryButtonToggle(dms, !dms.displayShowSummaryButton);
            setDms(newDms);
        },
        onShowReviewClicked: function() {
            let newDms = dmsShowReviewButtonToggle(dms, !dms.displayShowReviewButton);
            setDms(newDms);
        },
        onRefsToggle: function() {
            let newDms = dmsRefsToggle(dms);
            setDms(newDms);
        },
        onFormToggle: function() {
            let newDms = dmsUpdateFormToggle(dms);
            setDms(newDms);
        },
        buildPointForm: function(onSuccessCallback: any) {
            // currently only people and timelines have these endpoints
            //
            function onAddPoint(point: any) {
                if (dms.deck) {
                    let fake: any = dms.deck;
                    const url = `/api/${resource}/${fake.id}/points`;
                    Net.post(url, point).then(updatedDeck => {
                        update(updatedDeck);
                        onSuccessCallback();
                    });
                }
            };
            function onAddPoints(points: any) {
                if (dms.deck) {
                    let fake: any = dms.deck;
                    const url = `/api/${resource}/${fake.id}/multipoints`;
                    Net.post(url, points).then(updatedDeck => {
                        update(updatedDeck);
                        onSuccessCallback();
                    });
                }
            };

            return (<PointForm onSubmit={ onAddPoint } submitMessage="Create Point" onSubmitMultiplePoints={ onAddPoints }/>);
        },
        onRefsChanged,
        noteManagerForDeckPoint: function(deckPoint: any) {
            let fake: any = dms.deck;
            if (fake && fake.noteSeqs) {
                return NoteManager({
                    deck: dms.deck,
                    toolbarMode: appState.toolbarMode.value,
                    noteSeq: fake.noteSeqs.points[deckPoint.id],
                    resource,
                    onUpdateDeck: update,
                    onRefsChanged,
                    optionalDeckPoint: deckPoint,
                    appendLabel: `Append Note to ${ deckPoint.title }`,
                    noteKind: NOTE_KIND_NOTE
                });
            } else {
                return "FAKE";
            }
        },
        pointHasNotes: function(point: any) {
            let fake: any = dms.deck;
            return fake.notes.some(n => n.pointId === point.id);
        },
        canShowNoteSection: function(noteKind: any) {
            if (noteKind === NOTE_KIND_SUMMARY && dms.canHaveSummarySection) {
                return true;
            }
            if (noteKind === NOTE_KIND_REVIEW && dms.canHaveReviewSection) {
                return true;
            }
            if (noteKind === NOTE_KIND_NOTE) {
                return true;
            }
            return false;
        },
        howToShowNoteSection: function(noteKind: any): NoteSectionHowToShow {
            if (noteKind === NOTE_KIND_SUMMARY) {
                if (dms.canHaveSummarySection) {
                    return dms.displayShowSummaryButton ? NoteSectionHowToShow.Hide : NoteSectionHowToShow.Show;
                } else {
                    return NoteSectionHowToShow.Hide;
                }
            }

            if (noteKind === NOTE_KIND_REVIEW) {
                if (dms.canHaveReviewSection) {
                    return dms.displayShowReviewButton ? NoteSectionHowToShow.Hide : NoteSectionHowToShow.Show;
                } else {
                    return NoteSectionHowToShow.Hide;
                }
            }

            if (noteKind === NOTE_KIND_NOTE) {
                var r = NoteSectionHowToShow.Exclusive;
                if (dms.canHaveSummarySection && !dms.displayShowSummaryButton) {
                    r = NoteSectionHowToShow.Show;
                }
                if (dms.canHaveReviewSection && !dms.displayShowReviewButton) {
                    r = NoteSectionHowToShow.Show;
                }
                return r;
            }

            return NoteSectionHowToShow.Hide;
        }
    };

    return res;
}


function cleanDeckManagerState() {
    let res = {
        deck: undefined,
        isShowingUpdateForm: false,
        isEditingDeckRefs: false,
        canHaveSummarySection: false,
        canHaveReviewSection: false,
        displayShowSummaryButton: false,
        displayShowReviewButton: false
    }
    return res;
}

function dmsUpdateDeck(dms: any, deck: any, resource: any, scrollToTop: any) {
    // modify the notes received from the server
    applyDecksAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);

    AppStateChange.urlName(deckTitle(deck));
    AppStateChange.routeChanged(`/${resource}/${deck.id}`);

    let res = { ...dms };
    res.deck = deck;

    if (scrollToTop) {
        window.scrollTo(0, 0);
    }

    return res;
}

function dmsShowSummaryButtonToggle(dms: any, isToggled: any) {
    let res = {
        ...dms,
        displayShowSummaryButton: isToggled,
        isShowingUpdateForm: false
    };
    return res;
}

function dmsShowReviewButtonToggle(dms: any, isToggled: any) {
    let res = {
        ...dms,
        displayShowReviewButton: isToggled,
        isShowingUpdateForm: false
    };
    return res;
}

function dmsCanHaveSummarySection(dms: any, canHave: any) {
    let res = { ...dms };

    res.canHaveSummarySection = canHave;
    if (canHave) {
        res.displayShowSummaryButton = !res.deck.notes.some(n => n.kind === NOTE_KIND_SUMMARY);
    }

    return res;
}

function dmsCanHaveReviewSection(dms: any, canHave: any) {
    let res = { ...dms };

    res.canHaveReviewSection = canHave;

    if (canHave) {
        res.displayShowReviewButton = !res.deck.notes.some(n => n.kind === NOTE_KIND_REVIEW);
    }

    return res;
}

function dmsUpdateFormToggle(dms: any) {
    let res = { ...dms };
    res.isShowingUpdateForm = !res.isShowingUpdateForm;

    return res;
}

function dmsRefsToggle(dms: any) {
    let res = { ...dms };
    res.isEditingDeckRefs = !res.isEditingDeckRefs;

    return res;
}

function dmsHideForm(dms: any) {
    let res = {
        ...dms,
        isShowingUpdateForm: false
    };
    return res;
}

function applyDecksAndCardsToNotes(deck: any) {
    const decksInNotes = hashByNoteIds(deck.refs);
    const cardsInNotes = hashByNoteIds(deck.flashcards);

    for(let i = 0;i<deck.notes.length;i++) {
        let n = deck.notes[i];
        n.decks = decksInNotes[n.id] || [];
        n.decks.sort(sortByResourceThenName);
        n.flashcards = cardsInNotes[n.id];
    }
    return deck;
}

function hashByNoteIds(s: any) {
    let res = {};

    s = s || [];
    s.forEach(n => {
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

function buildNoteSeqs(deck: any) {
    deck.noteSeqs = {};

    // build NoteSeqs for notes associated with points
    deck.noteSeqs.points = noteSeqsForPoints(deck.notes);
    // add empty noteSeqs for points without any notes
    if (deck.points) {
        deck.points.forEach(p => {
            if (!deck.noteSeqs.points[p.id]) {
                deck.noteSeqs.points[p.id] = [];
            }
        });
    }

    // build NoteSeqs for all other note kinds
    deck.noteSeqs.note = noteSeqForNoteKind(deck.notes, "Note");
    deck.noteSeqs.noteDeckMeta = noteSeqForNoteKind(deck.notes, "NoteDeckMeta"); // should only be of length 1
    deck.noteSeqs.noteReview = noteSeqForNoteKind(deck.notes, "NoteReview");
    deck.noteSeqs.noteSummary = noteSeqForNoteKind(deck.notes, "NoteSummary");

    if (deck.noteSeqs.noteDeckMeta.length !== 1) {
        console.error(`deck: ${deck.id} has a NoteDeckMeta noteseq of length: ${deck.noteSeqs.noteDeckMeta.length} ???`);
    }

    return deck;
}

function noteSeqsForPoints(notes: any) {
    let p = {};
    notes.forEach(n => {
        if (n.pointId) {
            if (!p[n.pointId]) {
                p[n.pointId] = [];
            }
            p[n.pointId].push(n);
        }
    });

    Object.keys(p).forEach(k => {
        p[k] = createSeq(p[k]);
    });

    return p;
}

function noteSeqForNoteKind(notes: any, kind: any) {
    let ns = notes.filter(n => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createSeq(ns)
}

function createSeq(ns: any) {
    let h = {};
    let shouldBeFirst = false;

    // key by prevNoteId
    //
    ns.forEach(n => {
        if (n.prevNoteId) {
            h[n.prevNoteId] = n;
        } else {
            if (shouldBeFirst) {
                console.error("there is more than one note without a prev_note_id???");
            }
            shouldBeFirst = n;
        }

    });

    if (!shouldBeFirst) {
        console.error("no shouldBeFirst found by createSeq");
    }

    // create the ordered note seq to return
    let res: any = [];
    let item: any = shouldBeFirst;
    do {
        res.push(item);
        item = h[item.id];
    } while(item);

    return res;
}
