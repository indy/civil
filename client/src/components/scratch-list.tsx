import { h } from "preact";
import { getAppState, AppStateChange } from "app-state";
import { svgX, svgChevronDown, svgChevronUp } from "components/svg-icons";

import { SlimDeck } from "types";
import DeckLink from "components/deck-link";

export default function ScratchList() {
    const appState = getAppState();

    function buildScratchListEntry(entry: SlimDeck, i: number) {
        function clickedDelete() {
            AppStateChange.scratchListRemove(i);
        }

        return (
            <div class="scratchlist-result">
                <div class="scratchlist-result-remove" onClick={clickedDelete}>
                    {svgX()}
                </div>
                <DeckLink slimDeck={entry} alwaysLink />
            </div>
        );
    }

    function clickedToggle() {
        AppStateChange.scratchListToggle();
    }

    if (!!appState.scratchList.value.length) {
        const scratchList = appState.scratchList.value.map((entry, i) => (
            <li key={i}>{buildScratchListEntry(entry, i)}</li>
        ));

        return (
            <div id="scratchlist-component">
                {!appState.scratchListMinimised.value && (
                    <ul class="search-command-listing" id="scratchlist-results">
                        {scratchList}
                    </ul>
                )}
                {appState.scratchListMinimised.value ? (
                    <div class="scratchlist-menu">
                        <div onClick={clickedToggle}>{svgChevronUp()}</div>
                        <span class="scratchlist-menu-tip">
                            Maximise ScratchList
                        </span>
                    </div>
                ) : (
                    <div class="scratchlist-menu">
                        <div onClick={clickedToggle}>{svgChevronDown()}</div>
                        <span class="scratchlist-menu-tip">
                            Minimise ScratchList
                        </span>
                    </div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
