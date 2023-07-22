import { h } from "preact";

import { SlimDeck } from "types";
import DeckLink from "components/deck-link";

type ListingLinkProps = {
    slimDeck: SlimDeck;
};

export default function ListingLink({ slimDeck }: ListingLinkProps) {
    let res = (
        <li class="listing-link">
            <DeckLink slimDeck={slimDeck} />
        </li>
    );

    return res;
}
