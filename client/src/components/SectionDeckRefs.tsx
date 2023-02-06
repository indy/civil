import { h } from "preact";

import Net from "../Net";
import { AppStateChange } from "../AppState";

import CivilSelect from "./CivilSelect";
import Ref from "./Ref";

export default function SectionDeckRefs({
    deck,
    isEditing,
    onRefsChanged,
    onRefsToggle,
}: {
    deck?: any;
    isEditing?: any;
    onRefsChanged?: any;
    onRefsToggle?: any;
}) {
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
        entries = deckMeta.decks.map((ref) => {
            return <Ref deckReference={ref} extraClasses="deck-ref-item" />;
        });
    }

    return (
        <div class="deck-ref-section">
            {!isEditing && entries.length > 0 && (
                <div>
                    <hr class="light" />
                    {entries}
                    <hr class="light" />
                </div>
            )}
            {isEditing && (
                <AddDecksUI
                    deckId={deckId}
                    note={deckMeta}
                    chosen={deckMeta.decks}
                    onCancel={onCancel}
                    onSaved={onSaved}
                />
            )}
        </div>
    );
}

function AddDecksUI({
    deckId,
    note,
    chosen,
    onCancel,
    onSaved,
}: {
    deckId?: any;
    note?: any;
    chosen?: any;
    onCancel?: any;
    onSaved?: any;
}) {
    // todo: fix this typescript interface
    interface IFuckKnows {
        noteId: any;
        referencesChanged: any;
        referencesRemoved: any;
        referencesAdded: any;
        referencesCreated: any;
    }

    function referenceChanges(changes: any) {
        if (changes) {
            let data = {
                noteId: note.id,
                // references_unchanged: changes.referencesUnchanged,
                referencesChanged: changes.referencesChanged,
                referencesRemoved: changes.referencesRemoved,
                referencesAdded: changes.referencesAdded,
                referencesCreated: changes.referencesCreated,
            };

            Net.post<IFuckKnows, any>("/api/edges/notes_decks", data).then(
                (allDecksForNote) => {
                    onSaved(note, changes, allDecksForNote);
                }
            );
        } else {
            onCancel();
        }
    }

    return (
        <div class="block-width">
            <label>Connections:</label>
            <CivilSelect
                parentDeckId={deckId}
                chosen={chosen}
                onFinish={referenceChanges}
            />
        </div>
    );
}
