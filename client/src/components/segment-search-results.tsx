import { ComponentChildren, h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { CivilMode, Font, Key, SearchDeck, SearchResults } from "types";

import { getAppState } from "app-state";

import { addMultipleBookmarks } from "shared/bookmarks";
import { nonEmptyArray } from "shared/civil";
import { plural } from "shared/english";
import Net from "shared/net";

import CivilButton from "components/civil-button";
import RollableSegment from "components/rollable-segment";
import ViewSearchResults from "components/view-search-results";

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

    const [timing, setTiming] = useState(0);

    useEffect(() => {
        console.log(`/api/decks/${id}/additional_search`);

        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.getTimed<SearchResults>(`/api/decks/${id}/additional_search`).then(
            ([res, duration]) => {
                setSearchResults(res);
                setTiming(duration);
            }
        );
    }, [id]);

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
                <ViewSearchResults
                    searchResults={searchResults}
                    timing={timing}
                />
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
