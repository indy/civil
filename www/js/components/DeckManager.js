import { html, useEffect, useContext } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';
import { StateContext, useStateValue } from '/js/StateProvider.js';

import { NoteManager, NOTE_KIND_NOTE } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

export default function DeckManager({ id, resource, preCacheFn, hasSummarySection, hasReviewSection }) {
    const [state, appDispatch] = useStateValue();

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                appDispatch({ type: 'dms-update-deck', data: { deck: preCacheFn(deck), resource }});
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    let res = {};

    let title = state.deckManagerState.deck && (state.deckManagerState.deck.title || state.deckManagerState.deck.name || '');
    res.title = title;

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${state.deckManagerState.deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                appDispatch({ type: 'dms-update-deck', data: { deck: preCacheFn(updatedDeck), resource }});
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };

    function findNoteWithId(id, modifyFn) {
        const deck = state.deckManagerState.deck;
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};
        appDispatch({ type: 'dms-update-deck', data: { deck: preCacheFn(d), resource }});
    };

    function onRefsChanged(note, all_decks_for_note) {
        // have to set deck.refs to be the canonical version
        // (used to populate each note's decks array)

        // remove all deck.refs that relate to this note
        state.deckManagerState.deck.refs = state.deckManagerState.deck.refs.filter(din => {
            return din.note_id !== note.id;
        });
        // add every note.decks entry to deck.refs
        all_decks_for_note.forEach(d => { state.deckManagerState.deck.refs.push(d); });

        findNoteWithId(note.id, (notes, index) => {
            notes[index] = note;
        });
    };

    res.onRefsChanged = onRefsChanged;
    // res.preCacheFn = preCacheFn || function(d) { return d };

    function noteFilterDeckPoint(deck_point) {
        return n => n.point_id === deck_point.id;
    }

    res.noteManagerForDeckPoint = function(deck_point) {
        return NoteManager({ deck: state.deckManagerState.deck,
                             preCacheFn,
                             resource,
                             onRefsChanged,
                             filterFn: noteFilterDeckPoint(deck_point),
                             optional_deck_point: deck_point,
                             appendLabel: `Append Note to ${ deck_point.title }`,
                             noteKind: NOTE_KIND_NOTE
                           });
    }

    res.pointHasNotes = function(point) {
        return state.deckManagerState.deck.notes.some(n => n.point_id === point.id);
    }

    return res;
}
