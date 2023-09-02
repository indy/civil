import { h } from "preact";
import { useRef } from "preact/hooks";

import {
    CivilMode,
    FatDeck,
    Key,
    Note,
    NoteKind,
    Reference,
    RefsModified,
    RenderingDeckPart,
} from "types";

import { AppStateChange, getAppState } from "app-state";

import { addToolbarSelectableClasses } from "shared/css";
import { fontClass } from "shared/font";

import { CivContainer, CivMain } from "components/civil-layout";
import CivilSelect from "components/civil-select";
import useMouseHovering from "components/use-mouse-hovering";
import ViewReference from "components/view-reference";

type Props = {
    deck: FatDeck;
    isEditingDeckRefs: boolean;
    setEditingDeckRefs: (arg0: boolean) => void;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
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

    let containerClasses = fontClass(
        deck.font,
        RenderingDeckPart.UiInterleaved
    );
    containerClasses += " c-segment-deck-refs";

    if (mouseHovering) {
        let mode = appState.mode.value;
        // only show as selectable if in edit or refs mode
        if (mode === CivilMode.Refs) {
            containerClasses += addToolbarSelectableClasses(mode);
        }
    }

    function onSegmentClicked(e) {
        if (appState.mode.value === CivilMode.Refs && !isEditingDeckRefs) {
            setEditingDeckRefs(true);
        }
    }

    function onCancel() {
        setEditingDeckRefs(false);
    }

    function onSaved(
        note: Note,
        changes: RefsModified,
        refsInNote: Array<Reference>
    ) {
        // this note is going to be the deck's NoteDeckMeta
        onRefsChanged(note, refsInNote);

        AppStateChange.noteRefsModified({ refsInNote, changes });
        setEditingDeckRefs(false);
    }

    let deckId: Key = deck && deck.id;
    let deckMeta: Note | undefined =
        deck &&
        deck.passage[NoteKind.NoteDeckMeta] &&
        deck.passage[NoteKind.NoteDeckMeta][0];

    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs
    // each deck will only ever have one noteDeckMeta note

    if (deckMeta && deckMeta.refs) {
        return (
            <CivContainer extraClasses={containerClasses}>
                <div ref={hoveringRef} onClick={onSegmentClicked}>
                    {!isEditingDeckRefs && deckMeta.refs.length > 0 && (
                        <CivMain>
                            <hr class="light" />
                            {deckMeta.refs.map((ref) => (
                                <ViewReference
                                    reference={ref}
                                    extraClasses="deck-ref-item"
                                />
                            ))}
                            <hr class="light" />
                        </CivMain>
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
        refsInNote: Array<Reference>
    ) => void;
};

function AddDecksUI({
    deckId,
    note,
    chosen,
    onCancel,
    onSaved,
}: AddDecksUIProps) {
    function onSave(changes: RefsModified, refsInNote: Array<Reference>) {
        onSaved(note, changes, refsInNote);
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
