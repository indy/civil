import { h } from "preact";

import { SlimDeck } from "../types";

import { nonEmptyArray, plural } from "../JsUtils";

import RollableSection from "./RollableSection";
import { ListingLink } from "./ListingLink";

export default function SectionSearchResults({
    searchResults,
}: {
    searchResults: Array<SlimDeck>;
}) {
    function buildSearchResult(lb: SlimDeck) {
        return (
            <ListingLink
                id={lb.id}
                insignia={lb.insignia}
                title={lb.title}
                deckKind={lb.deckKind}
            />
        );
    }

    if (nonEmptyArray(searchResults)) {
        const heading = plural(
            searchResults.length,
            "Additional Search Result",
            "s"
        );
        return (
            <RollableSection heading={heading} initiallyRolledUp>
                <ul>{searchResults.map(buildSearchResult)}</ul>
            </RollableSection>
        );
    } else {
        return <div></div>;
    }
}
