import { html } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState, AppStateChange } from '/js/AppState.js';

import CivilSelect from '/js/components/CivilSelect.js';
import Ref from '/js/components/Ref.js';

export default function SectionDeckRefs({ deck, isEditing, onRefsChanged, onRefsToggle }) {
    function onCancel() {
        onRefsToggle();
    }
    function onSaved(note, changes, allDecksForNote) {
        // this note is going to be the deck's NoteDeckMeta
        onRefsChanged(note, allDecksForNote);

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        onRefsToggle();
    }

    let deckId = deck && deck.id;
    let deckMeta = deck && deck.noteSeqs && deck.noteSeqs.noteDeckMeta[0];
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs
    // each deck will only ever have one noteDeckMeta note

    let entries = [];
    if (deckMeta && deckMeta.decks) {
        entries = deckMeta.decks.map(ref => {
            return html`<${Ref} deckReference=${ref} extraClasses="deck-ref-item"/>`;
        });
    }

    return html`<div class="deck-ref-section">
        ${ !isEditing && entries.length > 0 && html`<div><hr class="light"/>${entries}<hr class="light"/></div>`}
        ${  isEditing && html`<${AddDecksUI} deckId=${deckId} note=${deckMeta} chosen=${deckMeta.decks} onCancel=${onCancel} onSaved=${ onSaved }/>` }
    </div>`;
}

function AddDecksUI({ deckId, note, chosen, onCancel, onSaved }) {

    function referenceChanges(changes) {
        if (changes) {
            let data = {
                noteId: note.id,
                // references_unchanged: changes.referencesUnchanged,
                referencesChanged: changes.referencesChanged,
                referencesRemoved: changes.referencesRemoved,
                referencesAdded: changes.referencesAdded,
                referencesCreated: changes.referencesCreated
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
