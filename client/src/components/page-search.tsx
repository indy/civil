import { useEffect, useState } from "preact/hooks";

import { CivilMode } from "../enums";
import type { Key, SearchResults } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { addMultipleBookmarks } from "../shared/bookmarks";
import Net from "../shared/net";
import { emptySearchResults } from "../shared/search";

import CivilButton from "./civil-button";
import { CivContainer, CivMainUi, CivLeft } from "./civil-layout";
import ViewSearchResults from "./view-search-results";

type SearchQuery = {
    q?: string;
};

export default function Search({
    path,
    matches,
}: {
    path?: string;
    matches?: SearchQuery;
}) {
    let encodedQuery: string = "";
    if (matches && matches.q) {
        encodedQuery = matches.q;
    }

    return <SearchModule encodedQuery={encodedQuery} />;
}

function SearchModule({ encodedQuery }: { encodedQuery: string }) {
    const appState = getAppState();

    const [results, setResults] = useState(emptySearchResults());
    const [timing, setTiming] = useState(0);

    useEffect(() => {
        if (encodedQuery.length > 0) {
            getSearchResults(encodedQuery);
        } else {
            setResults(emptySearchResults());
            setTiming(0);
        }
    }, [encodedQuery]);

    function getSearchResults(query: string) {
        const url = `/api/search/full?q=${query}`;
        Net.getTimed<SearchResults>(url).then(([response, duration]) => {
            setResults(response);
            setTiming(duration);
        });
    }

    function bookmarkAll() {
        let deckIds: Array<Key> = [];
        results.deckLevel.forEach((d) => deckIds.push(d.deck.id));
        results.noteLevel.forEach((n) => deckIds.push(n.deck.id));
        addMultipleBookmarks(deckIds);
        AppStateChange.mode({ mode: CivilMode.View });
    }

    const bookmarkMode = appState.mode.value === CivilMode.BookmarkLinks;

    // can't use a module since search will end up rendering user content
    //
    return (
        <article class="c-search-module module margin-top-5">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Search:</h3>
                </CivLeft>
                <CivMainUi>
                    <h3 class="ui">{encodedQuery}</h3>
                    {bookmarkMode && (
                        <CivilButton onClick={bookmarkAll}>
                            Bookmark All Results
                        </CivilButton>
                    )}
                </CivMainUi>
            </CivContainer>
            <ViewSearchResults searchResults={results} timing={timing} />
        </article>
    );
}
