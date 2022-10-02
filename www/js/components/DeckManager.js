import { html, useState, useEffect } from '/lib/preact/mod.js';

import { AppStateChange, DELUXE_TOOLBAR_VIEW } from '/js/AppState.js';
import Net from '/js/Net.js';
import { getAppState } from '/js/AppStateProvider.js';

import { NoteManager, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

import {
    cleanDeckManagerState,
    dmsRefsToggle,
    dmsUpdateFormToggle,
    dmsCanHaveSummarySection,
    dmsCanHaveReviewSection,
    dmsShowSummaryButtonToggle,
    dmsShowReviewButtonToggle,
    dmsUpdateDeck,
    dmsHideForm
} from '/js/components/DeckManagerState.js';

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
