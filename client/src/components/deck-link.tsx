import { ComponentChildren, h } from "preact";
import { Link } from "preact-router";
import { useRef } from "preact/hooks";

import { CivilMode, PreviewNotes, RenderingDeckPart, SlimDeck } from "types";

import { addBookmark } from "shared/bookmarks";
import { buildUrl } from "shared/civil";
import { deckKindToResourceString } from "shared/deck";
import { fontClass } from "shared/font";
import Net from "shared/net";

import { AppStateChange, getAppState } from "app-state";
import { renderInsignia, svgBookmarkLink } from "components/insignia-renderer";

// import useMouseHovering from "components/use-mouse-hovering";
import useMouseHoveringEvents from "components/use-mouse-hovering-events";

type Props = {
    slimDeck: SlimDeck;
    extraClasses?: string;
    onClick?: () => void;
    children?: ComponentChildren;
    alwaysLink?: boolean;
};

export default function DeckLink({
    slimDeck,
    extraClasses,
    onClick,
    children,
    alwaysLink,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    useMouseHoveringEvents(hoveringRef, onMouseEnter, onMouseLeave);

    function onMouseEnter() {
        if (!appState.previewCache.value[slimDeck.id]) {
            Net.get<PreviewNotes>(`/api/decks/preview/${slimDeck.id}`).then(
                (previewNotes) => {
                    AppStateChange.addPreview({ slimDeck, previewNotes });
                }
            );
        }
        AppStateChange.showPreviewDeck({ deckId: slimDeck.id });
    }
    function onMouseLeave() {
        AppStateChange.hidePreviewDeck({ deckId: slimDeck.id });
    }

    function clicked(_e: Event) {
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
    if (!alwaysLink && appState.mode.value === CivilMode.BookmarkLinks) {
        klass += " bookmarkmode-active";
        elem = (
            <span class={klass} onClick={bookmarkModeClicked}>
                {children}
                {svgBookmarkLink("#F91880")}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </span>
        );
    } else if (!alwaysLink && appState.mode.value !== CivilMode.View) {
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
