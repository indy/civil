import { useState, useRef } from "preact/hooks";

import { CivilMode, NoteKind, RenderingDeckPart, RefKind } from "../enums";
import type {
    Note,
    ReferencesApplied,
    ReferencesDiff,
    SearchDeck,
    SearchResults,
    SlimDeck,
    Reference,
} from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { plural } from "../shared/english";
import { fontClass } from "../shared/font";
import { addToolbarSelectableClasses } from "../shared/css";
import Net from "../shared/net";

import buildMarkup from "./build-markup";
import { CivContainer, CivLeft, CivMain } from "./civil-layout";
import CivilButton from "./civil-button";
import CivilSelect from "./civil-select";
import DeckLink from "./deck-link";
import Expandable from "./expandable";
import ListingLink from "./listing-link";
import ViewReference from "./view-reference";
import useFlashcards from "./use-flashcards";
import useMouseHovering from "./use-mouse-hovering";

export default function ViewSearchResults({
    searchResults,
    timing,
    parent,
}: {
    searchResults: SearchResults;
    timing: number;
    parent?: SlimDeck;
}) {
    const deckLevel = (
        <CivContainer>
            <CivMain>
                <ul>
                    {searchResults.deckLevel.map((searchDeck) => (
                        <ListingLink slimDeck={searchDeck.deck} />
                    ))}
                </ul>
            </CivMain>
        </CivContainer>
    );

    const noteLevel = searchResults.noteLevel.map((searchDeck) => (
        <ViewSearchDeck parent={parent} searchDeck={searchDeck} />
    ));

    let numResults =
        searchResults.noteLevel.length + searchResults.deckLevel.length;
    let status = plural(numResults, "result", "s");
    if (numResults > 0) {
        status += " returned";
    }
    if (timing > 0) {
        status += ` in ${timing}ms`;
    }

    return (
        <div class="c-view-search-results">
            <CivContainer>
                <CivMain extraClasses="ui display-flex-justify-right">
                    {status}
                </CivMain>
            </CivContainer>
            {deckLevel}
            {noteLevel}
        </div>
    );
}

function ViewSearchDeck({
    parent,
    searchDeck,
}: {
    parent?: SlimDeck;
    searchDeck: SearchDeck;
}) {

    function notMeta(note: Note): boolean {
        return note.kind !== NoteKind.NoteDeckMeta;
    }

    const searchNoteEntries = searchDeck.notes.filter(notMeta).map((searchNote) => (
        <SearchNote parent={parent} deck={searchDeck.deck} note={searchNote} />
    ));

    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={searchDeck.deck} />
        </span>
    );

    const tc = fontClass(searchDeck.deck.font, RenderingDeckPart.Body);
    const extraClasses = `c-render-search-deck margin-top-3 ${tc}`;

    return (
        <Expandable extraClasses={extraClasses} heading={heading}>
            {searchNoteEntries}
        </Expandable>
    );
}

function SearchNote({
    parent,
    deck,
    note,
}: {
    parent?: SlimDeck;
    deck: SlimDeck;
    note: Note;
}) {
    const appState = getAppState();

    const [flashcardIndicators, maximisedFlashcards] = useFlashcards(
        note.flashcards,
    );
    let [addDeckReferencesUI, setAddDeckReferencesUI] = useState(false);
    let [hide, setHide] = useState(false);

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    function buildRefs(refs: Array<Reference>) {
        return refs.map((ref) => (
            <ViewReference reference={ref} extraClasses="left-margin-entry" />
        ));
    }

    function onNoteClicked() {
        switch (appState.mode.value) {
            case CivilMode.Refs:
                if (!addDeckReferencesUI) {
                    setAddDeckReferencesUI(true);
                }
                break;
        }
    }

    function buildAddDecksUI() {
        function onSave(changes: ReferencesDiff, refsInNote: Array<Reference>) {
            setAddDeckReferencesUI(false);
            AppStateChange.noteRefsModified({ refsInNote, changes });
            note.refs = refsInNote;
        }

        function onCancel() {
            setAddDeckReferencesUI(false);
        }

        return (
            <CivilSelect
                extraClasses="form-margin"
                parentDeckId={deck.id}
                noteId={note.id}
                chosen={note.refs}
                onSave={onSave}
                onCancel={onCancel}
            />
        );
    }

    const refMode: boolean = appState.mode.value === CivilMode.Refs;
    let noteClasses = "c-search-note note";
    if (mouseHovering && refMode) {
        noteClasses += addToolbarSelectableClasses(appState.mode.value);
    }

    function onAdded() {
        setHide(true);
    }
    if (hide) {
        return (
            <CivContainer extraClasses={noteClasses}>
                <CivMain>
                    <p>Added Reference from Note to the current Deck</p>
                </CivMain>
            </CivContainer>
        );
    }
    return (
        <CivContainer extraClasses={noteClasses}>
            <CivLeft>
                {refMode && parent && (
                    <AddQuickRef
                        onAdded={onAdded}
                        parent={parent}
                        note={note}
                    />
                )}
                {flashcardIndicators}
                {buildRefs(note.refs)}
            </CivLeft>
            {maximisedFlashcards}
            <CivMain>
                <div onClick={onNoteClicked} ref={hoveringRef}>
                    {buildMarkup(note.content, note.font, note.id)}
                </div>
            </CivMain>

            {appState.mode.value === CivilMode.Refs &&
                addDeckReferencesUI &&
                buildAddDecksUI()}
        </CivContainer>
    );
}

function AddQuickRef({
    parent,
    note,
    onAdded,
}: {
    parent: SlimDeck;
    note: Note;
    onAdded: () => void;
}) {
    function onClick() {
        const ref: Reference = {
            id: parent.id,
            title: parent.title,
            createdAt: parent.createdAt,
            deckKind: parent.deckKind,
            graphTerminator: parent.graphTerminator,
            insignia: parent.insignia,
            font: parent.font,
            impact: parent.impact,
            noteId: note.id,
            refKind: RefKind.Ref,
        };

        let changeData: ReferencesDiff = {
            referencesChanged: [],
            referencesRemoved: [],
            referencesAdded: [ref],
            referencesCreated: [],
        };

        Net.put<ReferencesDiff, ReferencesApplied>(
            `/api/notes/${note.id}/references`,
            changeData,
        ).then((response) => {
            const recents = response.recents;
            AppStateChange.setRecentlyUsedDecks({ recents });
            onAdded();
        });
    }

    return (
        <CivilButton onClick={onClick}>Add Ref to {parent.title}</CivilButton>
    );
}
