import { h } from "preact";

import {
    Note,
    Reference,
    RenderingDeckPart,
    SearchDeck,
    SearchResults,
} from "types";

import { fontClass } from "shared/font";
import { plural } from "shared/english";

import buildMarkup from "components/build-markup";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";
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
        <SearchNote searchNote={searchNote} />
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
