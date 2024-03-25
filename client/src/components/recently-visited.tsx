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
    let url = "/api/decks/";
    if (deckKind) {
        let resource = deckKindToResourceString(deckKind);
        url += `recently_visited?resource=${resource}&`;
    } else {
        url += "recently_visited_any?";
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
