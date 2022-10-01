import { html, useEffect, useContext } from '/lib/preact/mod.js';

import { AppStateChange } from '/js/AppState.js';
import Net from '/js/Net.js';
import { useAppState } from '/js/AppStateProvider.js';

import { NoteManager, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW } from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';

export default function DeckManager({ id, resource, preCacheFn, canHaveSummarySection, canHaveReviewSection }) {
    const appState = useAppState();

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

    let title = appState.deckManagerState.value.deck && (appState.deckManagerState.value.deck.title || appState.deckManagerState.value.deck.name || '');
    res.title = title;

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${appState.deckManagerState.value.deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                AppStateChange.dmsUpdateDeck(preCacheFn(updatedDeck), resource, true);
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };

    function findNoteWithId(deck, id, modifyFn) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        let d = { ...deck, notes};

        AppStateChange.dmsUpdateDeck(preCacheFn(d), resource, false);
    };

    function onRefsChanged(note, allDecksForNote) {
        // have to make a copy of note so that preact's
        // diff algorithm can pick up the change
        //
        let n = {...note};

        let deck = appState.deckManagerState.value.deck;

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
    };

    res.onRefsChanged = onRefsChanged;

    res.noteManagerForDeckPoint = function(deckPoint) {
        return NoteManager({
            deck: appState.deckManagerState.value.deck,
            toolbarMode: appState.toolbarMode.value,
            noteSeq: appState.deckManagerState.value.deck.noteSeqs.points[deckPoint.id],
            preCacheFn,
            resource,
            onRefsChanged,
            optionalDeckPoint: deckPoint,
            appendLabel: `Append Note to ${ deckPoint.title }`,
            noteKind: NOTE_KIND_NOTE
        });
    }

    res.pointHasNotes = function(point) {
        return appState.deckManagerState.value.deck.notes.some(n => n.pointId === point.id);
    }

    return res;
}
