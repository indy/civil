import type { Key, Bookmark } from "../types";

import Net from "../shared/net";
import { AppStateChange } from "../app-state";

export function addBookmark(deckId: Key) {
    Net.post<Key, Array<Bookmark>>("/api/bookmarks", deckId).then(
        (bookmarks) => {
            AppStateChange.setBookmarks({ bookmarks });
        },
    );
}

export function addMultipleBookmarks(deckIds: Array<Key>) {
    Net.post<Array<Key>, Array<Bookmark>>("/api/bookmarks/multi", deckIds).then(
        (bookmarks) => {
            AppStateChange.setBookmarks({ bookmarks });
        },
    );
}

export function deleteBookmark(deckId: Key) {
    Net.delete<{}, Array<Bookmark>>(`/api/bookmarks/${deckId}`, {}).then(
        (bookmarks) => {
            AppStateChange.setBookmarks({ bookmarks });
        },
    );
}
