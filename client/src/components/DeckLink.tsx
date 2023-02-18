import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { DeckKind } from "../types";

import { buildUrl, deckKindToResourceString } from "../CivilUtils";
import { renderInsignia } from "./Insignias";

type Props = {
    extraClasses?: string;
    onClick?: () => void;
    deckKind: DeckKind;
    id: number;
    insignia: number;
    name: string;
    children?: ComponentChildren;
};

export default function DeckLink({
    extraClasses,
    onClick,
    deckKind,
    id,
    insignia,
    name,
    children,
}: Props) {
    function clicked(_e: Event) {
        if (onClick) {
            onClick();
        }
    }

    const klass = `${extraClasses} pigment-fg-${deckKindToResourceString(
        deckKind
    )}`;

    return (
        <Link class={klass} href={buildUrl(deckKind, id)} onClick={clicked}>
            {children}
            {renderInsignia(insignia)}
            {name}
        </Link>
    );
}
