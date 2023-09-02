import { h } from "preact";
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
} from "types";

import { AppStateChange, getAppState } from "app-state";

import { plural } from "shared/english";
import { fontClass } from "shared/font";

import buildMarkup from "components/build-markup";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";
import CivilSelect from "components/civil-select";
import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import ListingLink from "components/listing-link";
import ViewReference from "components/view-reference";

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
        <SearchNote deck={searchDeck.deck} searchNote={searchNote} />
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
    searchNote,
}: {
    deck: SlimDeck;
    searchNote: Note;
}) {
    const appState = getAppState();

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
            searchNote.refs = refsInNote;
        }

        function onCancel() {
            setAddDeckReferencesUI(false);
        }

        return (
            <CivilSelect
                extraClasses="form-margin"
                parentDeckId={deck.id}
                noteId={searchNote.id}
                chosen={searchNote.refs}
                onSave={onSave}
                onCancel={onCancel}
            />
        );
    }

    return (
        <CivContainer extraClasses="c-search-note note">
            <CivLeft>{buildRefs(searchNote.refs)}</CivLeft>
            <CivMain>
                <div onClick={onNoteClicked}>
                    {buildMarkup(
                        searchNote.content,
                        searchNote.font,
                        searchNote.id
                    )}
                </div>
            </CivMain>

            {appState.mode.value === CivilMode.Refs &&
                addDeckReferencesUI &&
                buildAddDecksUI()}
        </CivContainer>
    );
}
