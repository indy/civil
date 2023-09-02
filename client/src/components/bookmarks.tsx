import { h } from "preact";

import { Bookmark } from "types";

import { AppStateChange, getAppState } from "app-state";

import { deleteBookmark } from "shared/bookmarks";

import DeckLink from "components/deck-link";
import { svgChevronDown, svgChevronUp, svgX } from "components/svg-icons";

export default function Bookmarks() {
    const appState = getAppState();

    function buildBookmark(bookmark: Bookmark) {
        function clickedDelete() {
            deleteBookmark(bookmark.id);
        }

        return (
            <li key={bookmark.id} class="bookmark-result">
                <div class="bookmark-result-remove" onClick={clickedDelete}>
                    {svgX()}
                </div>
                <DeckLink slimDeck={bookmark.deck} alwaysLink />
            </li>
        );
    }

    function clickedToggle() {
        AppStateChange.bookmarkToggle();
    }

    if (!!appState.bookmarks.value.length) {
        const bookmarks = appState.bookmarks.value.map(buildBookmark);
        return (
            <div id="bookmark-component">
                {!appState.bookmarksMinimised.value && (
                    <ul id="bookmark-results">{bookmarks}</ul>
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
