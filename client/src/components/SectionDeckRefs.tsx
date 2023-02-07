import { h } from "preact";

import {
    IDeckCore,
    Note,
    ProtoNoteReferences,
    Ref,
    RefsModified,
} from "../types";

import Net from "../Net";
import { AppStateChange } from "../AppState";

import CivilSelect from "./CivilSelect";
import RefView from "./RefView";

type Props = {
    deck: IDeckCore;
    isEditing: boolean;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    onRefsToggle: () => void;
};

export default function SectionDeckRefs({
    deck,
    isEditing,
    onRefsChanged,
    onRefsToggle,
}: Props) {
    function onCancel() {
        onRefsToggle();
    }
    function onSaved(
        note: Note,
        changes: RefsModified,
        allDecksForNote: Array<Ref>
    ) {
        // this note is going to be the deck's NoteDeckMeta
        onRefsChanged(note, allDecksForNote);

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        onRefsToggle();
    }

    let deckId: number = deck && deck.id;
    let deckMeta: Note | undefined =
        deck && deck.noteSeqs && deck.noteSeqs.noteDeckMeta[0];
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs
    // each deck will only ever have one noteDeckMeta note

    if (deckMeta && deckMeta.decks) {
        return (
            <div class="deck-ref-section">
                {!isEditing && deckMeta.decks.length > 0 && (
                    <div>
                        <hr class="light" />
                        {deckMeta.decks.map((ref) => (
                            <RefView
                                deckReference={ref}
                                extraClasses="deck-ref-item"
                            />
                        ))}
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
    } else {
        return <div></div>;
    }
}

type AddDecksUIProps = {
    deckId: number;
    note: Note;
    chosen: Array<Ref>;
    onCancel: () => void;
    onSaved: (
        n: Note,
        changes: RefsModified,
        allDecksForNote: Array<Ref>
    ) => void;
};

function AddDecksUI({
    deckId,
    note,
    chosen,
    onCancel,
    onSaved,
}: AddDecksUIProps) {
    function referenceChanges(changes: RefsModified) {
        if (changes) {
            let data: ProtoNoteReferences = {
                noteId: note.id,
                referencesChanged: changes.referencesChanged,
                referencesRemoved: changes.referencesRemoved,
                referencesAdded: changes.referencesAdded,
                referencesCreated: changes.referencesCreated,
            };

            Net.post<ProtoNoteReferences, Array<Ref>>(
                "/api/edges/notes_decks",
                data
            ).then((allDecksForNote) => {
                onSaved(note, changes, allDecksForNote);
            });
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
