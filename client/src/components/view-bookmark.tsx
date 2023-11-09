import { useRef } from "preact/hooks";
import { route } from "preact-router";

import { RenderingDeckPart } from "../enums";
import type { Bookmark, PreviewNotes } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { deleteBookmark } from "../shared/bookmarks";
import { buildUrl } from "../shared/civil";
import { deckKindToResourceString } from "../shared/deck";
import { fontClass } from "../shared/font";
import Net from "../shared/net";

import { renderInsignia } from "./insignia-renderer";
import { svgX } from "./svg-icons";
import useMouseHoveringEvents from "./use-mouse-hovering-events";

export default function ViewBookmark({ bookmark }: { bookmark: Bookmark }) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    useMouseHoveringEvents(hoveringRef, onMouseEnter, onMouseLeave);

    let slimDeck = bookmark.deck;

    function onMouseEnter() {
        if (!appState.previewCache.value.has(slimDeck.id)) {
            Net.get<PreviewNotes>(`/api/decks/preview/${slimDeck.id}`).then(
                (previewNotes) => {
                    AppStateChange.addPreview({ slimDeck, previewNotes });
                },
            );
        }
        AppStateChange.showPreviewDeck({ deckId: slimDeck.id });
    }

    function onMouseLeave() {
        AppStateChange.hidePreviewDeck({ deckId: slimDeck.id });
    }

    function clickedDelete() {
        deleteBookmark(bookmark.id);
    }

    function clicked() {
        AppStateChange.hidePreviewDeck({ deckId: bookmark.deck.id });
        let slimDeck = bookmark.deck;
        let url = buildUrl(slimDeck.deckKind, slimDeck.id);
        route(url, true);
    }

    const tc = fontClass(slimDeck.font, RenderingDeckPart.UiInterleaved);
    const dk: string = deckKindToResourceString(slimDeck.deckKind);
    let klass = `bookmark-text ${tc} pigment-fg-${dk}`;

    return (
        <li
            key={bookmark.id}
            class="c-view-bookmark"
            onClick={clicked}
            ref={hoveringRef}
        >
            <div class="c-view-bookmark-remove" onClick={clickedDelete}>
                {svgX()}
            </div>
            <span class={klass}>
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </span>
        </li>
    );
}
