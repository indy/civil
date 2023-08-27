import { h } from "preact";

import { Note, Reference, SearchDeck, SearchResults } from "types";

import buildMarkup from "components/build-markup";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";
import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import ListingLink from "components/listing-link";
import ViewReference from "components/view-reference";

export default function ViewSearchResults({
    searchResults,
}: {
    searchResults: SearchResults;
}) {
    const noteLevel = searchResults.noteLevel.map((searchDeck) => (
        <ViewSearchDeck searchDeck={searchDeck} />
    ));
    const deckLevel = searchResults.deckLevel.map((searchDeck) => (
        <ListingLink slimDeck={searchDeck.deck} />
    ));

    return (
        <div class="c-civil-search-results">
            <CivContainer>
                <CivMain>
                    <ul>{deckLevel}</ul>
                </CivMain>
            </CivContainer>
            {noteLevel}
        </div>
    );
}

function ViewSearchDeck({ searchDeck }: { searchDeck: SearchDeck }) {
    const searchNoteEntries = searchDeck.notes.map((searchNote) => (
        <SearchNote searchNote={searchNote} />
    ));

    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={searchDeck.deck} />
        </span>
    );

    return (
        <Expandable
            extraClasses="c-render-search-deck margin-top-3"
            heading={heading}
        >
            {searchNoteEntries}
        </Expandable>
    );
}

function SearchNote({ searchNote }: { searchNote: Note }) {
    function buildRefs(refs: Array<Reference>) {
        return refs.map((ref) => (
            <ViewReference reference={ref} extraClasses="left-margin-entry" />
        ));
    }

    return (
        <CivContainer extraClasses="c-search-note note">
            <CivLeft>{buildRefs(searchNote.refs)}</CivLeft>
            <CivMain>
                {buildMarkup(
                    searchNote.content,
                    searchNote.font,
                    searchNote.id
                )}
            </CivMain>
        </CivContainer>
    );
}
