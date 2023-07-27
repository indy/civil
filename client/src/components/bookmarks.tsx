import { h } from "preact";
import { getAppState, AppStateChange } from "app-state";
import { svgX, svgChevronDown, svgChevronUp } from "components/svg-icons";

import { SlimDeck } from "types";
import DeckLink from "components/deck-link";

export default function Bookmarks() {
    const appState = getAppState();

    function buildBookmarkEntry(entry: SlimDeck, i: number) {
        function clickedDelete() {
            AppStateChange.bookmarkRemove(i);
        }

        return (
            <div class="bookmark-result">
                <div class="bookmark-result-remove" onClick={clickedDelete}>
                    {svgX()}
                </div>
                <DeckLink slimDeck={entry} alwaysLink />
            </div>
        );
    }

    function clickedToggle() {
        AppStateChange.bookmarkToggle();
    }

    if (!!appState.bookmarks.value.length) {
        const bookmarks = appState.bookmarks.value.map((entry, i) => (
            <li key={i}>{buildBookmarkEntry(entry, i)}</li>
        ));

        return (
            <div id="bookmark-component">
                {!appState.bookmarksMinimised.value && (
                    <ul class="search-command-listing" id="bookmark-results">
                        {bookmarks}
                    </ul>
                )}
                {appState.bookmarksMinimised.value ? (
                    <div class="bookmark-menu">
                        <div onClick={clickedToggle}>
                            {svgChevronDown()}
                            <span class="bookmark-menu-tip">
                                Maximise Bookmarks
                            </span>
                        </div>
                    </div>
                ) : (
                    <div class="bookmark-menu">
                        <div onClick={clickedToggle}>
                            {svgChevronUp()}
                            <span class="bookmark-menu-tip">
                                Minimise Bookmarks
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
