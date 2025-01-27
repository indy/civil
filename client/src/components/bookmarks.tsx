import type { Bookmark } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { svgChevronDown, svgChevronUp } from "./svg-icons";
import ViewBookmark from "./view-bookmark";

export default function Bookmarks() {
    const appState = getAppState();

    function buildBookmark(bookmark: Bookmark) {
        return <ViewBookmark bookmark={bookmark} />;
    }

    function clickedToggle() {
        AppStateChange.bookmarkToggle();
    }

    if (!!appState.bookmarks.value.length) {
        const bookmarks = appState.bookmarks.value.map(buildBookmark);
        return (
            <div id="bookmark-component">
                {!appState.bookmarksMinimised.value && (
                    <ul id="bookmarks">{bookmarks}</ul>
                )}
                {appState.bookmarksMinimised.value ? (
                    <div class="bookmark-menu">
                        <div onClick={clickedToggle}>
                            {svgChevronUp()}
                            <span class="bookmark-menu-tip">
                                Maximise Bookmarks
                            </span>
                        </div>
                    </div>
                ) : (
                    <div class="bookmark-menu">
                        <div onClick={clickedToggle}>
                            {svgChevronDown()}
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
