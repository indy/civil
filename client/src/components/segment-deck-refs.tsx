import { h } from "preact";
import { useRef } from "preact/hooks";

import {
    FatDeck,
    Key,
    Note,
    ProtoNoteReferences,
    Ref,
    RefsModified,
    ToolbarMode,
} from "types";

import Net from "utils/net";
import { getAppState, AppStateChange } from "app-state";
import { addToolbarSelectableClasses } from "utils/civil";

import CivilSelect from "components/civil-select";
import RefView from "components/ref-view";

import useMouseHovering from "components/use-mouse-hovering";

type Props = {
    deck: FatDeck;
    isEditing: boolean;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    onRefsToggle: () => void;
};

export default function SegmentDeckRefs({
    deck,
    isEditing,
    onRefsChanged,
    onRefsToggle,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    let containerClasses = "deck-ref-segment selectable-container";
    if (mouseHovering) {
        let toolbarMode = appState.toolbarMode.value;
        // only show as selectable if in edit or refs mode
        if (toolbarMode === ToolbarMode.Refs) {
            containerClasses += addToolbarSelectableClasses(toolbarMode);
        }
    }
    function onSegmentClicked(e) {
        if (appState.toolbarMode.value === ToolbarMode.Refs) {
            if (isEditing) {
                AppStateChange.toolbarMode(ToolbarMode.View);
            }
            onRefsToggle();
            return;
        }
    }

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

    let deckId: Key = deck && deck.id;
    let deckMeta: Note | undefined =
        deck && deck.noteSeqs && deck.noteSeqs.noteDeckMeta[0];
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs
    // each deck will only ever have one noteDeckMeta note

    if (deckMeta && deckMeta.decks) {
        return (
            <div
                class={containerClasses}
                ref={hoveringRef}
                onClick={onSegmentClicked}
            >
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
    deckId: Key;
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
