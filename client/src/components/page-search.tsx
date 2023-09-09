import { useState } from "preact/hooks";

import { CivilMode, Key, SearchResults } from "../types";

import { getAppState } from "../app-state";

import { addMultipleBookmarks } from "../shared/bookmarks";
import Net from "../shared/net";
import { sanitize } from "../shared/search";

import CivilButton from "./civil-button";
import CivilInput from "./civil-input";
import { CivContainer, CivLeft, CivMainUi } from "./civil-layout";
import TopBarMenu from "./top-bar-menu";
import ViewSearchResults from "./view-search-results";

export default function Search({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SearchModule />
        </div>
    );
}

function SearchModule() {
    const appState = getAppState();

    const [results, setResults] = useState({
        deckLevel: [],
        noteLevel: [],
    } as SearchResults);

    const [timing, setTiming] = useState(0);

    function onReturnPressed(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/search/full?q=${encodeURI(sanitized)}`;
            Net.getTimed<SearchResults>(url).then(([response, duration]) => {
                setResults(response);
                setTiming(duration);
            });
        }
    }

    function bookmarkAll() {
        let deckIds: Array<Key> = [];
        results.deckLevel.forEach((d) => deckIds.push(d.deck.id));
        results.noteLevel.forEach((n) => deckIds.push(n.deck.id));
        addMultipleBookmarks(deckIds);
    }

    const bookmarkMode = appState.mode.value === CivilMode.BookmarkLinks;

    // can't use a module since search will end up rendering user content
    //
    return (
        <article class="c-search-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Full Search</h3>
                </CivLeft>
                <CivMainUi>
                    {bookmarkMode && (
                        <CivilButton onClick={bookmarkAll}>
                            Bookmark All Results
                        </CivilButton>
                    )}
                    <CivilInput
                        elementClass="width-100"
                        onReturnPressed={onReturnPressed}
                    />
                </CivMainUi>
            </CivContainer>
            <ViewSearchResults searchResults={results} timing={timing} />
        </article>
    );
}
