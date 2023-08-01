import { h, ComponentChildren } from "preact";

import { SlimDeck, Font, CivilMode, Key } from "types";

import { getAppState } from "app-state";

import { addMultipleBookmarks } from "shared/bookmarks";
import { nonEmptyArray } from "shared/civil";
import { plural } from "shared/english";

import CivilButton from "components/civil-button";
import ListingLink from "components/listing-link";
import RollableSegment from "components/rollable-segment";
import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentSearchResults({
    searchResults,
    font,
}: {
    searchResults: Array<SlimDeck>;
    font: Font;
}) {
    const appState = getAppState();

    function buildSearchResult(slimDeck: SlimDeck) {
        return <ListingLink slimDeck={slimDeck} />;
    }

    if (nonEmptyArray<SlimDeck>(searchResults)) {
        const heading = plural(
            searchResults.length,
            "Additional Search Result",
            "s"
        );

        function bookmarkAll() {
            const deckIds: Array<Key> = searchResults.map((sd) => sd.id);
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
            >
                <CivContainer>
                    <CivMain>
                        <ul>{searchResults.map(buildSearchResult)}</ul>
                    </CivMain>
                </CivContainer>
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
