import { html, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import { NoteManager, NOTE_KIND_NOTE } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

function applyDecksAndCardsToNotes(obj) {
    const decksInNotes = hashByNoteIds(obj.refs);
    const cardsInNotes = hashByNoteIds(obj.flashcards);

    for(let i = 0;i<obj.notes.length;i++) {
        let n = obj.notes[i];
        n.decks = decksInNotes[n.id] || [];
        n.decks.sort(sortByResourceThenName);
        n.flashcards = cardsInNotes[n.id];
    }

    return obj;
}

function hashByNoteIds(s) {
    s = s || [];
    return s.reduce(function(a, b) {
        const note_id = b.note_id;
        if (a[note_id]) {
            a[note_id].push(b);
        } else {
            a[note_id] = [b];
        }
        return a;
    }, {});
}

function makeCacheDeckFn(preCacheFn, resource) {
    return function(newdeck) {
        if (preCacheFn) {
            newdeck = preCacheFn(newdeck);
        }

        const [state, appDispatch] = useStateValue();

        let updatedDeck = applyDecksAndCardsToNotes(newdeck);
        updatedDeck.noteDeckMeta = updatedDeck.notes.find(n => n.kind === 'NoteDeckMeta');

        appDispatch({type: 'dms-update-deck', data: updatedDeck, resource: resource});
    }
}

// preCacheFn performs any one-off calculations before caching the Deck
function DeckManager({ id, resource, preCacheFn, hasSummarySection, hasReviewSection }) {
    // returns helper fn that applies preCacheFn and stores deck in AppState

    const [state, appDispatch] = useStateValue();

    const cacheDeck = makeCacheDeckFn(preCacheFn, resource);

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                cacheDeck(deck);
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
                cacheDeck(updatedDeck);
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
        cacheDeck({...deck, notes});
    };

    function onRefsChanged(note, all_decks_for_note) {
        // have to set deck.refs to be the canonical version
        // 'cacheDeck' will use that to populate each note's decks array

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
    res.cacheDeck = cacheDeck;

    function noteFilterDeckPoint(deck_point) {
        return n => n.point_id === deck_point.id;
    }

    res.noteManagerForDeckPoint = function(deck_point) {
        return NoteManager({ deck: state.deckManagerState.deck,
                             cacheDeck,
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

export { DeckManager };
