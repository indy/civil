import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { DeckKind } from "../types";

import { deckKindToResourceString } from "../CivilUtils";
import { renderInsignia } from "./Insignias";

type Props = {
    extraClasses?: string;
    onClick?: () => void;
    resource: DeckKind;
    href: string;
    insignia: number;
    name: string;
    children?: ComponentChildren;
};

export default function DeckLink({
    extraClasses,
    onClick,
    resource,
    href,
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
        resource
    )}`;
    return (
        <Link class={klass} href={href} onClick={clicked}>
            {children}
            {renderInsignia(insignia)}
            {name}
        </Link>
    );
}
