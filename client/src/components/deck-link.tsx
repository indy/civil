import { h, ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { Link } from "preact-router";

import { PreviewNotes, RenderingDeckPart, SlimDeck, CivilMode } from "types";

import Net from "shared/net";
import { buildUrl } from "shared/civil";
import { deckKindToResourceString } from "shared/deck";
import { fontClass } from "shared/font";
import { addBookmark } from "shared/bookmarks";

import { getAppState, AppStateChange } from "app-state";
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
                (pn) => {
                    AppStateChange.addPreview(slimDeck, pn);
                }
            );
        }
        AppStateChange.showPreviewDeck(slimDeck.id);
    }
    function onMouseLeave() {
        AppStateChange.hidePreviewDeck(slimDeck.id);
    }

    function clicked(_e: Event) {
        AppStateChange.hidePreviewDeck(slimDeck.id);
        if (onClick) {
            onClick();
        }
    }

    function bookmarkModeClicked() {
        AppStateChange.hidePreviewDeck(slimDeck.id);
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

    return <span ref={hoveringRef}>{elem}</span>;
}
