import { h } from "preact";

import DeckLink from "components/deck-link";
import { SlimDeck } from "types";

type ListingLinkProps = {
    slimDeck: SlimDeck;
    extraClasses?: string;
};

export default function ListingLink({
    slimDeck,
    extraClasses,
}: ListingLinkProps) {
    let klass = "listing-link";
    if (extraClasses) {
        klass += " " + extraClasses;
    }

    let res = (
        <li class={klass}>
            <DeckLink slimDeck={slimDeck} />
        </li>
    );

    return res;
}
