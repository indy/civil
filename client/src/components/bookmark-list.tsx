import { h } from "preact";
import { getAppState, AppStateChange } from "app-state";
import { svgX, svgChevronDown, svgChevronUp } from "components/svg-icons";

import { SlimDeck } from "types";
import DeckLink from "components/deck-link";

export default function BookmarkList() {
    const appState = getAppState();

    function buildBookmarkListEntry(entry: SlimDeck, i: number) {
        function clickedDelete() {
            AppStateChange.bookmarkListRemove(i);
        }

        return (
            <div class="bookmarks-result">
                <div class="bookmarks-result-remove" onClick={clickedDelete}>
                    {svgX()}
                </div>
                <DeckLink slimDeck={entry} alwaysLink />
            </div>
        );
    }

    function clickedToggle() {
        AppStateChange.bookmarkListToggle();
    }

    if(!!appState.bookmarkList.value.length) {

        const bookmarkList = appState.bookmarkList.value.map((entry, i) => (
            <li key={i}>{buildBookmarkListEntry(entry, i)}</li>
        ));

        return (
            <div id="bookmarks-component">
                {!appState.bookmarkListMinimised.value && (
                    <ul class="search-command-listing" id="bookmarks-results">
                        {bookmarkList}
                    </ul>
                )}
            {appState.bookmarkListMinimised.value ? (
                <div class="bookmarks-menu">
                    <div onClick={clickedToggle}>{svgChevronUp()}</div>
                    <span class="bookmarks-menu-tip">
                    Maximise Bookmark List
                </span>
                    </div>
            ) : (
                <div class="bookmarks-menu">
                    <div onClick={clickedToggle}>{svgChevronDown()}</div>
                    <span class="bookmarks-menu-tip">
                    Minimise Bookmark List
                </span>
                    </div>
            )}
            </div>
        );

    } else {
        return <div></div>
    }
}
