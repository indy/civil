import { html, useEffect, useContext } from '/lib/preact/mod.js';

import { AppStateChange } from '/js/AppState.js';
import Net from '/js/Net.js';
import { StateContext, useStateValue } from '/js/StateProvider.js';

import { NoteManager, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

export default function DeckManager({ id, resource, preCacheFn, canHaveSummarySection, canHaveReviewSection }) {
    const state = useStateValue();

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                AppStateChange.dmsUpdateDeck(preCacheFn(deck), resource, true);
                AppStateChange.dmsCanHaveSummarySection(canHaveSummarySection);
                AppStateChange.dmsCanHaveReviewSection(canHaveReviewSection);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    let res = {};

    let title = state.deckManagerState.value.deck && (state.deckManagerState.value.deck.title || state.deckManagerState.value.deck.name || '');
    res.title = title;

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${state.deckManagerState.value.deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                AppStateChange.dmsUpdateDeck(preCacheFn(updatedDeck), resource, true);
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };

    function findNoteWithId(id, modifyFn) {
        const deck = state.deckManagerState.value.deck;
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};
        AppStateChange.dmsUpdateDeck(preCacheFn(d), resource, true);
    };

    function onRefsChanged(note, allDecksForNote) {
        // have to set deck.refs to be the canonical version
        // (used to populate each note's decks array)

        // remove all deck.refs that relate to this note
        state.deckManagerState.value.deck.refs = state.deckManagerState.value.deck.refs.filter(din => {
            return din.noteId !== note.id;
        });
        // add every note.decks entry to deck.refs
        allDecksForNote.forEach(d => { state.deckManagerState.value.deck.refs.push(d); });

        findNoteWithId(note.id, (notes, index) => {
            notes[index] = note;
        });
    };

    res.onRefsChanged = onRefsChanged;

    res.noteManagerForDeckPoint = function(deckPoint) {
        return NoteManager({ deck: state.deckManagerState.value.deck,
                             noteSeq: state.deckManagerState.value.deck.noteSeqs.points[deckPoint.id],
                             preCacheFn,
                             resource,
                             onRefsChanged,
                             optionalDeckPoint: deckPoint,
                             appendLabel: `Append Note to ${ deckPoint.title }`,
                             noteKind: NOTE_KIND_NOTE
                           });
    }

    res.pointHasNotes = function(point) {
        return state.deckManagerState.value.deck.notes.some(n => n.pointId === point.id);
    }

    return res;
}
