import { h } from "preact";

import { SlimDeck } from "types";

import ListingLink from "components/listing-link";

export function renderPaginatedSlimDeck(deck: SlimDeck, i: number) {
    return (
        <ListingLink
            slimDeck={deck}
            extraClasses={i % 2 ? "stripe-a" : "stripe-b"}
        />
    );
}
