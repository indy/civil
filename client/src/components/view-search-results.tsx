import { useState } from "preact/hooks";

import {
    CivilMode,
    Note,
    Reference,
    RefsModified,
    RenderingDeckPart,
    SearchDeck,
    SearchResults,
    SlimDeck,
} from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { plural } from "../shared/english";
import { fontClass } from "../shared/font";

import buildMarkup from "./build-markup";
import { CivContainer, CivLeft, CivMain } from "./civil-layout";
import CivilSelect from "./civil-select";
import DeckLink from "./deck-link";
import Expandable from "./expandable";
import ListingLink from "./listing-link";
import ViewReference from "./view-reference";
import useFlashcards from "./use-flashcards";

export default function ViewSearchResults({
    searchResults,
    timing,
}: {
    searchResults: SearchResults;
    timing: number;
}) {
    const noteLevel = searchResults.noteLevel.map((searchDeck) => (
        <ViewSearchDeck searchDeck={searchDeck} />
    ));

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

function ViewSearchDeck({ searchDeck }: { searchDeck: SearchDeck }) {
    const searchNoteEntries = searchDeck.notes.map((searchNote) => (
        <SearchNote deck={searchDeck.deck} note={searchNote} />
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
    deck,
    note,
}: {
    deck: SlimDeck;
    note: Note;
}) {
    const appState = getAppState();

    const [flashcardIndicators, maximisedFlashcards] = useFlashcards(note.flashcards);
    let [addDeckReferencesUI, setAddDeckReferencesUI] = useState(false);

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
        function onSave(changes: RefsModified, refsInNote: Array<Reference>) {
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

    return (
        <CivContainer extraClasses="c-search-note note">
            <CivLeft>
                {flashcardIndicators}
                {buildRefs(note.refs)}
            </CivLeft>
            {maximisedFlashcards}
            <CivMain>
                <div onClick={onNoteClicked}>
                    {buildMarkup(
                        note.content,
                        note.font,
                        note.id
                    )}
                </div>
            </CivMain>

            {appState.mode.value === CivilMode.Refs &&
                addDeckReferencesUI &&
                buildAddDecksUI()}
        </CivContainer>
    );
}
