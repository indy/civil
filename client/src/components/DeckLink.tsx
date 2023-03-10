import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { SlimDeck } from "../types";

import { buildUrl, deckKindToResourceString } from "../CivilUtils";
import { getAppState, AppStateChange } from "../AppState";
import { renderInsignia, svgBookmarkLink } from "./Insignias";

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

    if (!alwaysLink && appState.bookmarkNextLink.value) {
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
