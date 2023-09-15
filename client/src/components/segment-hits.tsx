import { Hit, FatDeck } from "../types";

import { prettyPrintTimeSpan } from "../shared/time";

function SingleHit({ hit }: { hit: Hit }) {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    // the .000Z make the date format comply with the ISO 8601 format
    let n = Date.parse(hit.createdAt + ".000Z");

    let d = new Date(n);
    const textual = d.toLocaleDateString("en-GB", options);

    let current = Date.now();
    let deltaMS = current - n;

    let span = prettyPrintTimeSpan(deltaMS);

    return <li><div>{textual}</div> <div>{span} ago</div></li>;
}

type SegmentHitsProps<T extends FatDeck> = {
    displayHits: boolean;
    deck: T;
};

const SegmentHits = <T extends FatDeck>({
    displayHits,
    deck,
}: SegmentHitsProps<T>) => {
    if (displayHits) {
        let hits = deck.hits.map((h) => <SingleHit hit={h} />);
        return <ul class="c-segment-hits ui">{hits}</ul>;
    } else {
        return <div class="c-segment-hits"> </div>;
    }
};

export default SegmentHits;
