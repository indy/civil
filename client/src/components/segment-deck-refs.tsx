import { h } from "preact";
import { useRef } from "preact/hooks";

import {
    FatDeck,
    Key,
    Note,
    Reference,
    RefsModified,
    ToolbarMode,
} from "types";

import { getAppState, AppStateChange } from "app-state";
import { addToolbarSelectableClasses } from "utils/civil";

import { CivContainer } from "components/civil-layout";
import CivilSelect from "components/civil-select";
import RefView from "components/ref-view";

import useMouseHovering from "components/use-mouse-hovering";

type Props = {
    deck: FatDeck;
    isEditingDeckRefs: boolean;
    setEditingDeckRefs: (boolean) => void;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
};

export default function SegmentDeckRefs({
    deck,
    isEditingDeckRefs,
    setEditingDeckRefs,
    onRefsChanged,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    let containerClasses = "deck-ref-segment";
    if (mouseHovering) {
        let toolbarMode = appState.toolbarMode.value;
        // only show as selectable if in edit or refs mode
        if (toolbarMode === ToolbarMode.Refs) {
            containerClasses += addToolbarSelectableClasses(toolbarMode);
        }
    }

    function onSegmentClicked(e) {
        if (
            appState.toolbarMode.value === ToolbarMode.Refs &&
            !isEditingDeckRefs
        ) {
            setEditingDeckRefs(true);
        }
    }

    function onCancel() {
        setEditingDeckRefs(false);
    }

    function onSaved(
        note: Note,
        changes: RefsModified,
        allDecksForNote: Array<Reference>
    ) {
        // this note is going to be the deck's NoteDeckMeta
        onRefsChanged(note, allDecksForNote);

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        setEditingDeckRefs(false);
    }

    let deckId: Key = deck && deck.id;
    let deckMeta: Note | undefined =
        deck && deck.noteSeqs && deck.noteSeqs.noteDeckMeta[0];
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs
    // each deck will only ever have one noteDeckMeta note

    if (deckMeta && deckMeta.refs) {
        return (
            <CivContainer extraClasses={containerClasses}>
                <div ref={hoveringRef} onClick={onSegmentClicked}>
                    {!isEditingDeckRefs && deckMeta.refs.length > 0 && (
                        <div>
                            <hr class="light" />
                            {deckMeta.refs.map((ref) => (
                                <RefView
                                    ref={ref}
                                    extraClasses="deck-ref-item"
                                />
                            ))}
                            <hr class="light" />
                        </div>
                    )}
                    {isEditingDeckRefs && (
                        <AddDecksUI
                            deckId={deckId}
                            note={deckMeta}
                            chosen={deckMeta.refs}
                            onCancel={onCancel}
                            onSaved={onSaved}
                        />
                    )}
                </div>
            </CivContainer>
        );
    } else {
        return <div></div>;
    }
}

type AddDecksUIProps = {
    deckId: Key;
    note: Note;
    chosen: Array<Reference>;
    onCancel: () => void;
    onSaved: (
        n: Note,
        changes: RefsModified,
        allDecksForNote: Array<Reference>
    ) => void;
};

function AddDecksUI({
    deckId,
    note,
    chosen,
    onCancel,
    onSaved,
}: AddDecksUIProps) {
    function onSave(changes: RefsModified, allDecksForNote: Array<Reference>) {
        onSaved(note, changes, allDecksForNote);
    }

    return (
        <CivilSelect
            noteId={note.id}
            parentDeckId={deckId}
            chosen={chosen}
            onSave={onSave}
            onCancel={onCancel}
        />
    );
}
