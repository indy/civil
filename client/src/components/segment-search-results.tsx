import { h } from "preact";

import { SlimDeck, Font } from "types";

import { nonEmptyArray, plural } from "utils/js";

import RollableSegment from "components/rollable-segment";
import ListingLink from "components/listing-link";

import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentSearchResults({
    searchResults,
    font,
}: {
    searchResults: Array<SlimDeck>;
    font: Font;
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
            <RollableSegment heading={heading} font={font} initiallyRolledUp>
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
