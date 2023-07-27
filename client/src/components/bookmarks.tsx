import { h } from "preact";

import { Bookmark } from "types";

import Net from "utils/net";

import { getAppState, AppStateChange } from "app-state";

import { svgX, svgChevronDown, svgChevronUp } from "components/svg-icons";
import DeckLink from "components/deck-link";

export default function Bookmarks() {
    const appState = getAppState();

    function buildBookmark(bookmark: Bookmark) {
        function clickedDelete() {
            Net.delete<{}, Array<Bookmark>>(`/api/bookmarks/${bookmark.id}`, {}).then(
                (bookmarks) => {
                    AppStateChange.setBookmarks(bookmarks);
                }
            );
        }

        return (
            <div class="bookmark-result">
                <div class="bookmark-result-remove" onClick={clickedDelete}>
                    {svgX()}
                </div>
                <DeckLink slimDeck={bookmark.deck} alwaysLink />
            </div>
        );
    }

    function clickedToggle() {
        AppStateChange.bookmarkToggle();
    }

    if (!!appState.bookmarks.value.length) {
        const bookmarks = appState.bookmarks.value.map((bookmark) => (
            <li key={bookmark.id}>{buildBookmark(bookmark)}</li>
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
