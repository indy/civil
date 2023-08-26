import { h } from "preact";
import { useState } from "preact/hooks";

import { SeekDeck, SearchResults } from "types";

import Net from "shared/net";
import { sanitize } from "shared/search";

import CivilInput from "components/civil-input";
import { CivContainer, CivLeft, CivMainUi } from "components/civil-layout";
import CivilSeekResults from "components/civil-seek-results";
import TopBarMenu from "components/top-bar-menu";

export default function Seek({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SeekModule />
        </div>
    );
}

function SeekModule() {
    const [seekResults, setSeekResults] = useState([] as Array<SeekDeck>);

    function onReturnPressed(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/notes/seek?q=${encodeURI(sanitized)}`;
            Net.get<SearchResults>(url).then((response) => {
                setSeekResults(response.noteLevel);
            });
        }
    }

    // can't use a module since seek will end up rendering user content
    //
    return (
        <article class="c-seek-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Seek</h3>
                </CivLeft>
                <CivMainUi>
                    <CivilInput onReturnPressed={onReturnPressed} />
                </CivMainUi>
            </CivContainer>
            <CivilSeekResults seekResults={seekResults} />
        </article>
    );
}
