import { h } from "preact";

import { FatDeck } from "types";

import { getAppState } from "app-state";

import Graph from "components/graph/graph";
import RollableSegment from "components/rollable-segment";

export default function SegmentGraph({
    depth,
    deck,
}: {
    depth: number;
    deck: FatDeck;
}) {
    const appState = getAppState();

    if (appState.showConnectivityGraph.value && deck) {
        const okToShowGraph =
            (deck.notes && deck.notes.length > 0) || deck.backrefs;
        const heading = "Connectivity Graph";

        return (
            <RollableSegment heading={heading} initiallyRolledUp interleaved>
                {okToShowGraph && <Graph id={deck.id} depth={depth} />}
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
