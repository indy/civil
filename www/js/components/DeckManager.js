import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { AppStateChange, DELUXE_TOOLBAR_VIEW } from '/js/AppState.js';
import { getAppState } from '/js/AppStateProvider.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';

import { NoteManager, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW } from '/js/components/NoteSection.js';
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

    let title = dms.deck && (dms.deck.title || dms.deck.name || '');

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
        dms,
        title,
        update,
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
        refsToggle: function() {
            let newDms = dmsRefsToggle(dms);
            setDms(newDms);
        },
        formToggle: function() {
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
        }
    };

    return res;
}


function cleanDeckManagerState() {
    let res = {
        deck: undefined,
        showUpdateForm: false,
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
    AppStateChange.urlName(deck.title || deck.name);
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
    res.showUpdateForm = !res.showUpdateForm;

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
        showUpdateForm: false
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

    ns.forEach(n => h[n.id] = n);

    // find the prevNoteId for each note
    ns.forEach(n => {
        if (n.nextNoteId) {
            h[n.nextNoteId].prevNoteId = n.id;
        } else {
            // this is the last element
        }
    });

    // now find the first element
    let shouldBeFirst = h[ns[0].id];
    while (shouldBeFirst.prevNoteId) {
        shouldBeFirst = h[shouldBeFirst.prevNoteId];
    }

    // create the ordered note seq to return
    let res = [];
    let item = shouldBeFirst;
    do {
        res.push(item);
        item = h[item.nextNoteId];
    } while(item);

    return res;
}
