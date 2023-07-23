import { h } from "preact";

import { SlimDeck } from "types";

import { nonEmptyArray, plural } from "utils/js";

import RollableSegment from "components/rollable-segment";
import ListingLink from "components/listing-link";

import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentSearchResults({
    searchResults,
    typeface,
}: {
    searchResults: Array<SlimDeck>;
    typeface: string;
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
            <RollableSegment
                heading={heading}
                typeface={typeface}
                initiallyRolledUp
                interleaved
            >
                <CivContainer>
                    <CivMain>
                        <ul>{searchResults.map(buildSearchResult)}</ul>
                    </CivMain>
                </CivContainer>
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
