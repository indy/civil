import { DeckKind } from "../enums";

import { deckKindToResourceString } from "../shared/deck";

import { HeadedSegment } from "./headed-segment";
import EagerLoadedGrouping from "./eager-loaded-grouping";

type RecentlyVisitedProps = {
    deckKind?: DeckKind;
    numRecent: number;
};

export default function RecentlyVisited({
    deckKind,
    numRecent,
}: RecentlyVisitedProps) {
    let url = "/api/decks/recently_visited?";
    if (deckKind) {
        let resource = deckKindToResourceString(deckKind);
        url += `resource=${resource}&`;
    }
    url += `num=${numRecent}`;

    return (
        <HeadedSegment
            extraClasses="margin-top-5"
            heading="Recently Visited"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            <EagerLoadedGrouping url={url} />
        </HeadedSegment>
    );
}
