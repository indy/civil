import type { SlimDeck } from "../types";

import DeckLink from "./deck-link";

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
