import { h } from "preact";
import { useState } from "preact/hooks";

import { SearchDeck, SearchResults } from "types";

import Net from "shared/net";
import { sanitize } from "shared/search";

import CivilInput from "components/civil-input";
import { CivContainer, CivLeft, CivMainUi } from "components/civil-layout";
import CivilSearchResults from "components/civil-search-results";
import TopBarMenu from "components/top-bar-menu";

export default function Search({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SearchModule />
        </div>
    );
}

function SearchModule() {
    const [results, setResults] = useState([] as Array<SearchDeck>);

    function onReturnPressed(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/notes/search?q=${encodeURI(sanitized)}`;
            Net.get<SearchResults>(url).then((response) => {
                setResults(response.noteLevel);
            });
        }
    }

    // can't use a module since seek will end up rendering user content
    //
    return (
        <article class="c-seek-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Full Search</h3>
                </CivLeft>
                <CivMainUi>
                    <CivilInput onReturnPressed={onReturnPressed} />
                </CivMainUi>
            </CivContainer>
            <CivilSearchResults searchResults={results} />
        </article>
    );
}
