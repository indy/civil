import { html, useEffect } from '/lib/preact/mod.js';

import { sortByResourceThenName } from '/js/CivilUtils.js';
import { NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';
import { AppStateChange } from '/js/AppState.js';

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


export {
    cleanDeckManagerState,
    dmsShowSummaryButtonToggle,
    dmsShowReviewButtonToggle,
    dmsCanHaveSummarySection,
    dmsCanHaveReviewSection,
    dmsUpdateFormToggle,
    dmsRefsToggle,
    dmsUpdateDeck,
    dmsHideForm
};
