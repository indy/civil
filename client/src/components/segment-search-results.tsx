import { h, ComponentChildren } from "preact";

import { SearchResults, SlimDeck, SeekDeck, Font, CivilMode, Key } from "types";

import { getAppState } from "app-state";

import { addMultipleBookmarks } from "shared/bookmarks";
import { nonEmptyArray } from "shared/civil";
import { plural } from "shared/english";

import CivilButton from "components/civil-button";
import ListingLink from "components/listing-link";
import RollableSegment from "components/rollable-segment";
import { CivContainer, CivMain } from "components/civil-layout";
import CivilSeekResults from "components/civil-seek-results";

export default function SegmentSearchResults({
    searchResults,
    font,
}: {
    searchResults: SearchResults;
    font: Font;
}) {
    const appState = getAppState();

    function buildSearchResult(slimDeck: SlimDeck) {
        return <ListingLink slimDeck={slimDeck} />;
    }

    if (
        nonEmptyArray<SlimDeck>(searchResults.searchResults) ||
        nonEmptyArray<SeekDeck>(searchResults.seekResults)
    ) {
        const amount =
            searchResults.searchResults.length +
            searchResults.seekResults.length;
        const heading = plural(amount, "Additional Search Result", "s");

        // TODO: fix this to work with the new SearchResults structure that also contains SeekDecks
        function bookmarkAll() {
            const deckIds: Array<Key> = searchResults.searchResults.map(
                (sd) => sd.id
            );
            addMultipleBookmarks(deckIds);
        }

        let button: ComponentChildren | undefined = undefined;
        if (appState.mode.value == CivilMode.BookmarkLinks) {
            button = (
                <CivilButton onClick={bookmarkAll}>
                    Add All Results to Bookmarks
                </CivilButton>
            );
        }

        return (
            <RollableSegment
                heading={heading}
                font={font}
                buttons={button}
                initiallyRolledUp
                extraClasses="c-segment-search-results"
            >
                <CivContainer>
                    <CivMain>
                        <ul>
                            {searchResults.searchResults.map(buildSearchResult)}
                        </ul>
                    </CivMain>
                </CivContainer>
                <CivilSeekResults seekResults={searchResults.seekResults} />
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
