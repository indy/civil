import { h } from "preact";

import { SlimDeck } from "types";

import { nonEmptyArray, plural } from "utils/js";

import RollableSegment from "components/rollable-segment";
import { ListingLink } from "components/listing-link";

import { CivMain } from "components/civil-layout";

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
                <CivMain>
                    <ul>{searchResults.map(buildSearchResult)}</ul>
                </CivMain>
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
