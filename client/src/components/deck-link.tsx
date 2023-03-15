import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { SlimDeck, ToolbarMode } from "types";

import { buildUrl, deckKindToResourceString } from "../civil-utils";
import { getAppState, AppStateChange } from "app-state";
import { renderInsignia, svgBookmarkLink } from "./insignias";

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

    function clicked(_e: Event) {
        if (onClick) {
            onClick();
        }
    }

    function bookmarkModeClicked() {
        AppStateChange.addBookmarkLink(slimDeck);
    }

    const ec: string = extraClasses || "";
    const dk: string = deckKindToResourceString(slimDeck.deckKind);
    let klass = `${ec} pigment-fg-${dk}`;

    if (
        !alwaysLink &&
        appState.toolbarMode.value === ToolbarMode.BookmarkLinks
    ) {
        klass += " bookmarkmode-active";
        return (
            <span class={klass} onClick={bookmarkModeClicked}>
                {children}
                {svgBookmarkLink("#ff00ff")}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </span>
        );
    } else {
        return (
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
}
