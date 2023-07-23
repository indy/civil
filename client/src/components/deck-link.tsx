import { h, ComponentChildren } from "preact";
import { useRef /*, useState*/ } from "preact/hooks";
import { Link } from "preact-router";

import { PreviewNotes, RenderingDeckPart, SlimDeck, CivilMode } from "types";

import Net from "utils/net";
import { buildUrl, deckKindToResourceString, typefaceClass } from "utils/civil";
import { getAppState, AppStateChange } from "app-state";
import {
    renderInsignia,
    svgScratchListLink,
} from "components/insignia-renderer";

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

    function scratchListModeClicked() {
        AppStateChange.hidePreviewDeck(slimDeck.id);
        AppStateChange.addScratchListLink(slimDeck);
    }

    const tc = typefaceClass(
        slimDeck.typeface,
        RenderingDeckPart.UiInterleaved
    );
    const ec: string = extraClasses || "";
    const dk: string = deckKindToResourceString(slimDeck.deckKind);
    let klass = `${tc} ${ec} pigment-fg-${dk}`;

    let elem: any;
    if (!alwaysLink && appState.mode.value === CivilMode.ScratchListLinks) {
        klass += " scratchlistmode-active";
        elem = (
            <span class={klass} onClick={scratchListModeClicked}>
                {children}
                {svgScratchListLink("#F91880")}
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
