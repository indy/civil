import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { DeckKind } from "../types";

import { deckKindToResourceString } from "../CivilUtils";
import { renderInsignia } from "./Insignias";

type Props = {
    extraClasses?: string;
    onClick?: () => void;
    resource: DeckKind;
    id: number;
    insignia: number;
    name: string;
    children?: ComponentChildren;
};

export default function DeckLink({
    extraClasses,
    onClick,
    resource,
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

    const resourceString = deckKindToResourceString(resource);
    const href = `/${resourceString}/${id}`;
    const klass = `${extraClasses} pigment-fg-${resourceString}`;

    return (
        <Link class={klass} href={href} onClick={clicked}>
            {children}
            {renderInsignia(insignia)}
            {name}
        </Link>
    );
}
