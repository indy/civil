import { html } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { useStateValue } from '/js/StateProvider.js';
import { Ref } from '/js/components/Ref.js';
import CivilSelect from '/js/components/CivilSelect.js';

export default function SectionDeckRefs({ onRefsChanged }) {
    const [state, appDispatch] = useStateValue();

        function onCancel() {
            appDispatch({type: 'dms-refs-toggle'});
        }
        function onSaved(note, changes, allDecksForNote) {
            // this note is going to be the deck's NoteDeckMeta
            onRefsChanged(note, allDecksForNote);

            // todo: combine these two appDispatch calls
            appDispatch({
                type: 'noteRefsModified',
                changes,
                allDecksForNote,
            });
            appDispatch({type: 'dms-refs-toggle'});
        }

    let deck = state.deckManagerState.deck;
    let editing = state.deckManagerState.isEditingDeckRefs;

    let deckId = deck && deck.id;
    let deckMeta = deck && deck.noteDeckMeta;
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs

    let entries = [];
    if (deckMeta && deckMeta.decks) {
        entries = deckMeta.decks.map(ref => {
            return html`<${Ref} deckReference=${ref} extraClasses="deck-ref-item"/>`;
        });
    }

    return html`<div class="deck-ref-section">
        ${ !editing && entries.length > 0 && html`<div><hr class="light"/>${entries}<hr class="light"/></div>`}
        ${  editing && html`<${AddDecksUI} deckId=${deckId} note=${deckMeta} chosen=${deckMeta.decks} onCancel=${onCancel} onSaved=${ onSaved }/>` }
    </div>`;
}

function AddDecksUI({ deckId, note, chosen, onCancel, onSaved }) {

    function referenceChanges(changes) {
        // todo: what if someone:
        // 1. clicks on edit note
        // 2. adds decks
        // 3. clicks ok (these decks should now be associated with the note)
        // 4. clicks on edit note
        // 5. adds more decks
        // 6. clicks cancel
        // expected: only the changes from step 5 should be undone

        if (changes) {
            let data = {
                note_id: note.id,
                // references_unchanged: changes.referencesUnchanged,
                references_changed: changes.referencesChanged,
                references_removed: changes.referencesRemoved,
                references_added: changes.referencesAdded,
                references_created: changes.referencesCreated
            };

            Net.post("/api/edges/notes_decks", data).then((allDecksForNote) => {
                onSaved(note, changes, allDecksForNote)
            });
        } else {
            onCancel();
        }

    };

    return html`
        <div class="block-width">
            <label>Connections:</label>
            <${ CivilSelect } parentDeckId=${ deckId }
                              chosen=${ chosen }
                              onFinish=${ referenceChanges }/>
        </div>`;
};
