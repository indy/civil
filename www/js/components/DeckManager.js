import { html, useEffect, useContext } from '/lib/preact/mod.js';

import { dmsUpdateDeck } from '/js/AppState.js';
import Net from '/js/Net.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';
import { StateContext, useStateValue } from '/js/StateProvider.js';

import { NoteManager, NOTE_KIND_NOTE } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

export default function DeckManager({ id, resource, preCacheFn, hasSummarySection, hasReviewSection }) {
    const state = useStateValue();

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                dmsUpdateDeck(state, preCacheFn(deck), resource);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    let res = {};

    let title = state.sigs.deckManagerState.value.deck && (state.sigs.deckManagerState.value.deck.title || state.sigs.deckManagerState.value.deck.name || '');
    res.title = title;

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${state.sigs.deckManagerState.value.deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                dmsUpdateDeck(state, preCacheFn(updatedDeck), resource);
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };

    function findNoteWithId(id, modifyFn) {
        const deck = state.sigs.deckManagerState.value.deck;
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};
        dmsUpdateDeck(state, preCacheFn(d), resource);
    };

    function onRefsChanged(note, allDecksForNote) {
        // have to set deck.refs to be the canonical version
        // (used to populate each note's decks array)

        // remove all deck.refs that relate to this note
        state.sigs.deckManagerState.value.deck.refs = state.sigs.deckManagerState.value.deck.refs.filter(din => {
            return din.noteId !== note.id;
        });
        // add every note.decks entry to deck.refs
        allDecksForNote.forEach(d => { state.sigs.deckManagerState.value.deck.refs.push(d); });

        findNoteWithId(note.id, (notes, index) => {
            notes[index] = note;
        });
    };

    res.onRefsChanged = onRefsChanged;

    res.noteManagerForDeckPoint = function(deckPoint) {
        return NoteManager({ deck: state.sigs.deckManagerState.value.deck,
                             noteSeq: state.sigs.deckManagerState.value.deck.noteSeqs.points[deckPoint.id],
                             preCacheFn,
                             resource,
                             onRefsChanged,
                             optionalDeckPoint: deckPoint,
                             appendLabel: `Append Note to ${ deckPoint.title }`,
                             noteKind: NOTE_KIND_NOTE
                           });
    }

    res.pointHasNotes = function(point) {
        return state.sigs.deckManagerState.value.deck.notes.some(n => n.pointId === point.id);
    }

    return res;
}
