import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { AppStateChange, DELUXE_TOOLBAR_VIEW } from '/js/AppState.js';
import { getAppState } from '/js/AppStateProvider.js';
import { sortByResourceThenName, deckTitle } from '/js/CivilUtils.js';

import { NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW
       } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

export default function DeckManager({ id, resource, preCacheFn, hasSummarySection, hasReviewSection }) {
    const appState = getAppState();

    const [dms, setDms] = useState(cleanDeckManagerState());

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                let newDms = dmsUpdateDeck(dms, preCacheFn(deck), resource, true);
                newDms = dmsCanHaveSummarySection(newDms, hasSummarySection);
                newDms = dmsCanHaveReviewSection(newDms, hasReviewSection);
                setDms(newDms);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    function update(newDeck) {
        let newDms = dmsUpdateDeck(dms, preCacheFn(newDeck), resource, false);
        setDms(newDms);
    }
    function findNoteWithId(deck, id, modifyFn) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};

        update(d);
    };

    function onRefsChanged(note, allDecksForNote) {
        // have to make a copy of note so that preact's
        // diff algorithm can pick up the change
        //
        let n = {...note};

        let deck = dms.deck;

        // have to set deck.refs to be the canonical version
        // (used to populate each note's decks array)

        // remove all deck.refs that relate to this note
        deck.refs = deck.refs.filter(din => {
            return din.noteId !== n.id;
        });
        // add every note.decks entry to deck.refs
        allDecksForNote.forEach(d => { deck.refs.push(d); });

        findNoteWithId(deck, n.id, (notes, index) => {
            notes[index] = n;
        });

        update(deck);
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
        updateAndReset: function(newDeck) {
            let newDms = dmsUpdateDeck(dms, preCacheFn(newDeck), resource, true);
            newDms = dmsHideForm(newDms);
            AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

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
        buildPointForm: function(onSuccessCallback) {
            function onAddPoint(point) {
                const url = `/api/${resource}/${dms.deck.id}/points`;
                Net.post(url, point).then(updatedDeck => {
                    update(updatedDeck);
                    onSuccessCallback();
                });
            };

            return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
        },
        onRefsChanged,
        noteManagerForDeckPoint: function(deckPoint) {
            return NoteManager({
                deck: dms.deck,
                toolbarMode: appState.toolbarMode.value,
                noteSeq: dms.deck.noteSeqs.points[deckPoint.id],
                resource,
                onRefsChanged,
                optionalDeckPoint: deckPoint,
                appendLabel: `Append Note to ${ deckPoint.title }`,
                noteKind: NOTE_KIND_NOTE
            });
        },
        pointHasNotes: function(point) {
            return dms.deck.notes.some(n => n.pointId === point.id);
        },
        canShowNoteSection: function(noteKind) {
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
        howToShowNoteSection: function(noteKind) {
            if (noteKind === NOTE_KIND_SUMMARY) {
                if (dms.canHaveSummarySection) {
                    return dms.displayShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
                } else {
                    return NOTE_SECTION_HIDE;
                }
            }

            if (noteKind === NOTE_KIND_REVIEW) {
                if (dms.canHaveReviewSection) {
                    return dms.displayShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
                } else {
                    return NOTE_SECTION_HIDE;
                }
            }

            if (noteKind === NOTE_KIND_NOTE) {
                var r = NOTE_SECTION_EXCLUSIVE;
                if (dms.canHaveSummarySection && !dms.displayShowSummaryButton) {
                    r = NOTE_SECTION_SHOW;
                }
                if (dms.canHaveReviewSection && !dms.displayShowReviewButton) {
                    r = NOTE_SECTION_SHOW;
                }
                return r;
            }

            return NOTE_SECTION_HIDE;
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

function dmsUpdateDeck(dms, deck, resource, scrollToTop) {
    // modify the notes received from the server
    applyDecksAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);

    // todo: maybe move this back into the apps router now that we're using signals
    AppStateChange.urlName(deckTitle(deck));
    AppStateChange.routeChanged(`/${resource}/${deck.id}`);

    let res = { ...dms };
    res.deck = deck;

    if (scrollToTop) {
        window.scrollTo(0, 0);
    }

    return res;
}

function dmsShowSummaryButtonToggle(dms, isToggled) {
    let res = { ...dms };
    res.displayShowSummaryButton = isToggled;
    return res;
}

function dmsShowReviewButtonToggle(dms, isToggled) {
    let res = { ...dms };
    res.displayShowReviewButton = isToggled;
    return res;
}

function dmsCanHaveSummarySection(dms, canHave) {
    let res = { ...dms };

    res.canHaveSummarySection = canHave;
    if (canHave) {
        res.displayShowSummaryButton = !res.deck.notes.some(n => n.kind === NOTE_KIND_SUMMARY);
    }

    return res;
}

function dmsCanHaveReviewSection(dms, canHave) {
    let res = { ...dms };

    res.canHaveReviewSection = canHave;

    if (canHave) {
        res.displayShowReviewButton = !res.deck.notes.some(n => n.kind === NOTE_KIND_REVIEW);
    }

    return res;
}

function dmsUpdateFormToggle(dms) {
    let res = { ...dms };
    res.isShowingUpdateForm = !res.isShowingUpdateForm;

    return res;
}

function dmsRefsToggle(dms) {
    let res = { ...dms };
    res.isEditingDeckRefs = !res.isEditingDeckRefs;

    return res;
}

function dmsHideForm(dms) {
    let res = {
        ...dms,
        isShowingUpdateForm: false
    };
    return res;
}

function applyDecksAndCardsToNotes(deck) {
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


// todo: hashByNoteIds is using the "I'm so clever" reduce style. noteSeqsForPoints is using a much simpler forEach
//       perhaps change hashByNoteIds to forEach?
function hashByNoteIds(s) {
    s = s || [];
    return s.reduce(function(a, b) {
        const noteId = b.noteId;
        if (a[noteId]) {
            a[noteId].push(b);
        } else {
            a[noteId] = [b];
        }
        return a;
    }, {});
}

function buildNoteSeqs(deck) {
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

function noteSeqsForPoints(notes) {
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

function noteSeqForNoteKind(notes, kind) {
    let ns = notes.filter(n => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createSeq(ns)
}

function createSeq(ns) {
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
    let res = [];
    let item = shouldBeFirst;
    do {
        res.push(item);
        item = h[item.id];
    } while(item);

    return res;
}
