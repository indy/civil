import { useEffect, useState } from "preact/hooks";

import { CivilMode } from "../enums";
import type { SlimDeck, Key, SearchDeck, SearchResults } from "../types";

import { getAppState } from "../app-state";

import { addMultipleBookmarks } from "../shared/bookmarks";
import { nonEmptyArray } from "../shared/civil";
import { plural } from "../shared/english";
import Net from "../shared/net";

import CivilButton from "./civil-button";
import RollableSegment from "./rollable-segment";
import ViewSearchResults from "./view-search-results";

export default function SegmentSearchResults({
    slimdeck,
}: {
    slimdeck: SlimDeck;
}) {
    const appState = getAppState();

    const [searchResults, setSearchResults]: [SearchResults, Function] =
        useState({ deckLevel: [], noteLevel: [] });

    const [timing, setTiming] = useState(0);

    useEffect(() => {
        const id = slimdeck.id;

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
            },
        );
    }, [slimdeck.id]);

    if (
        nonEmptyArray<SearchDeck>(searchResults.deckLevel) ||
        nonEmptyArray<SearchDeck>(searchResults.noteLevel)
    ) {
        const amount =
            searchResults.deckLevel.length + searchResults.noteLevel.length;
        const heading = plural(amount, "Additional Search Result", "s");

        function bookmarkAll() {
            const deckIds: Array<Key> = searchResults.deckLevel.map(
                (sd) => sd.deck.id,
            );
            addMultipleBookmarks(deckIds);
        }

        let showButton = appState.mode.value == CivilMode.BookmarkLinks;

        return (
            <RollableSegment
                heading={heading}
                font={slimdeck.font}
                initiallyRolledUp
                extraClasses="c-segment-search-results"
            >
                {showButton && (
                    <CivilButton onClick={bookmarkAll}>
                        Bookmark All Results
                    </CivilButton>
                )}

                <ViewSearchResults
                    parent={slimdeck}
                    searchResults={searchResults}
                    timing={timing}
                />
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
