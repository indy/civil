import { type ComponentChildren } from "preact";
import { Link } from "preact-router";
import { useRef } from "preact/hooks";

import { CivilMode, PageState, RenderingDeckPart } from "../enums";
import type { PreviewNotes, SlimDeck } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { addBookmark } from "../shared/bookmarks";
import { buildUrl } from "../shared/civil";
import { deckKindToResourceString } from "../shared/deck";
import { fontClass } from "../shared/font";
import Net from "../shared/net";

import { renderInsignia, svgBookmarkLink } from "./insignia-renderer";
import useMouseHoveringEvents from "./use-mouse-hovering-events";

type Props = {
    slimDeck: SlimDeck;
    extraClasses?: string;
    onClick?: () => void;
    children?: ComponentChildren;
};

export default function DeckLink({
    slimDeck,
    extraClasses,
    onClick,
    children,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    useMouseHoveringEvents(hoveringRef, onMouseEnter, onMouseLeave);

    function onMouseEnter() {
        if (appState.pageState.value !== PageState.PageLoading) {
            if (!appState.previewCache.value.has(slimDeck.id)) {
                Net.get<PreviewNotes>(`/api/decks/preview/${slimDeck.id}`).then(
                    (previewNotes) => {
                        AppStateChange.addPreview({ slimDeck, previewNotes });
                    },
                );
            }
            AppStateChange.showPreviewDeck({ deckId: slimDeck.id });
        } else {
            // ignore hover events and don't show previews if
            // the user has already clicked on a link and is
            // waiting for that deck to load
        }
    }
    function onMouseLeave() {
        AppStateChange.hidePreviewDeck({ deckId: slimDeck.id });
    }

    function clicked(_e: Event) {
        AppStateChange.setPageState({ pageState: PageState.PageLoading });
        AppStateChange.hidePreviewDeck({ deckId: slimDeck.id });
        if (onClick) {
            onClick();
        }
    }

    function bookmarkModeClicked() {
        AppStateChange.hidePreviewDeck({ deckId: slimDeck.id });
        addBookmark(slimDeck.id);
    }

    const tc = fontClass(slimDeck.font, RenderingDeckPart.UiInterleaved);
    const ec: string = extraClasses || "";
    const dk: string = deckKindToResourceString(slimDeck.deckKind);
    let klass = `${tc} ${ec} pigment-fg-${dk}`;

    let elem: any;
    if (appState.mode.value === CivilMode.BookmarkLinks) {
        klass += " bookmarkmode-active";
        elem = (
            <span class={klass} onClick={bookmarkModeClicked}>
                {children}
                {svgBookmarkLink("#F91880")}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </span>
        );
    } else if (appState.mode.value !== CivilMode.View) {
        elem = (
            <span class={klass}>
                {children}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </span>
        );
    } else {
        elem = (
            <Link
                class={klass}
                href={buildUrl(slimDeck.deckKind, slimDeck.id)}
                onClick={clicked}
            >
                {children}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </Link>
        );
    }

    return (
        <span class="c-deck-link" ref={hoveringRef}>
            {elem}
        </span>
    );
}
