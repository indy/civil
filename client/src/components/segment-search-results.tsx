import { ComponentChildren, h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { CivilMode, Font, Key, SearchResults, SeekDeck } from "types";

import { getAppState } from "app-state";

import { addMultipleBookmarks } from "shared/bookmarks";
import { nonEmptyArray } from "shared/civil";
import { plural } from "shared/english";
import Net from "shared/net";

import CivilButton from "components/civil-button";
import { CivContainer, CivMain } from "components/civil-layout";
import CivilSeekResults from "components/civil-seek-results";
import ListingLink from "components/listing-link";
import RollableSegment from "components/rollable-segment";

//    searchResults: SearchResults;

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
    //         useState({ searchResults: [], seekResults: [] });

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

    function buildSearchResult(seekDeck: SeekDeck) {
        return <ListingLink slimDeck={seekDeck.deck} />;
    }

    if (
        nonEmptyArray<SeekDeck>(searchResults.deckLevel) ||
        nonEmptyArray<SeekDeck>(searchResults.noteLevel)
    ) {
        const amount =
            searchResults.deckLevel.length +
            searchResults.noteLevel.length;
        const heading = plural(amount, "Additional Search Result", "s");

        // TODO: fix this to work with the new SearchResults structure that also contains SeekDecks
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
                <CivilSeekResults seekResults={searchResults.noteLevel} />
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
