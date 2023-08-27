import { ComponentChildren, h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { CivilMode, Font, Key, SearchResults, SearchDeck } from "types";

import { getAppState } from "app-state";

import { addMultipleBookmarks } from "shared/bookmarks";
import { nonEmptyArray } from "shared/civil";
import { plural } from "shared/english";
import Net from "shared/net";

import CivilButton from "components/civil-button";
import { CivContainer, CivMain } from "components/civil-layout";
import CivilSearchResults from "components/civil-search-results";
import ListingLink from "components/listing-link";
import RollableSegment from "components/rollable-segment";

// todo: fix the type for deckId, should be a Key
//
export default function SegmentSearchResults({
    id,
    font,
}: {
    id?: string;
    font: Font;
}) {
    const appState = getAppState();

    const [searchResults, setSearchResults]: [SearchResults, Function] =
        useState({ deckLevel: [], noteLevel: [] });

    useEffect(() => {
        console.log(`/api/decks/${id}/additional_search`);

        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get<SearchResults>(`/api/decks/${id}/additional_search`).then(
            (res) => {
                setSearchResults(res);
            }
        );
    }, [id]);

    function buildSearchResult(searchDeck: SearchDeck) {
        return <ListingLink slimDeck={searchDeck.deck} />;
    }

    if (
        nonEmptyArray<SearchDeck>(searchResults.deckLevel) ||
        nonEmptyArray<SearchDeck>(searchResults.noteLevel)
    ) {
        const amount =
            searchResults.deckLevel.length + searchResults.noteLevel.length;
        const heading = plural(amount, "Additional Search Result", "s");

        function bookmarkAll() {
            const deckIds: Array<Key> = searchResults.deckLevel.map(
                (sd) => sd.deck.id
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
                            {searchResults.deckLevel.map(buildSearchResult)}
                        </ul>
                    </CivMain>
                </CivContainer>
                <CivilSearchResults searchResults={searchResults.noteLevel} />
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
