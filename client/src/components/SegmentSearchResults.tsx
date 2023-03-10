import { h } from "preact";

import { SlimDeck } from "../types";

import { nonEmptyArray, plural } from "../JsUtils";

import RollableSegment from "./RollableSegment";
import { ListingLink } from "./ListingLink";

export default function SegmentSearchResults({
    searchResults,
}: {
    searchResults: Array<SlimDeck>;
}) {
    function buildSearchResult(slimDeck: SlimDeck) {
        return <ListingLink slimDeck={slimDeck} />;
    }

    if (nonEmptyArray<SlimDeck>(searchResults)) {
        const heading = plural(
            searchResults.length,
            "Additional Search Result",
            "s"
        );
        return (
            <RollableSegment heading={heading} initiallyRolledUp>
                <ul>{searchResults.map(buildSearchResult)}</ul>
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
