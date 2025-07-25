import type { FatDeck } from "../types";

import { getAppState } from "../app-state";

import Graph from "./graph";
import RollableSegment from "./rollable-segment";

export default function SegmentGraph({ deck }: { deck: FatDeck }) {
    const appState = getAppState();

    if (appState.showConnectivityGraph.value && deck) {
        const okToShowGraph = deck.notes && deck.notes.length > 0;
        const heading = "Connectivity Graph";

        return (
            <RollableSegment
                heading={heading}
                font={deck.font}
                initiallyRolledUp
            >
                {okToShowGraph && <Graph id={deck.id} />}
            </RollableSegment>
        );
    } else {
        return <div></div>;
    }
}
