import { h } from "preact";

import { getAppState } from "../AppState";

import Graph from "./Graph";
import RollableSection from "./RollableSection";

export default function SectionGraph({
    depth,
    deck,
}: {
    depth?: any;
    deck?: any;
}) {
    const appState = getAppState();

    if (appState.showConnectivityGraph.value && deck) {
        const okToShowGraph =
            (deck.notes && deck.notes.length > 0) || deck.backrefs;
        const heading = deck.title ? `Connectivity Graph` : "";

        return (
            <RollableSection heading={heading} initiallyRolledUp>
                {okToShowGraph && <Graph id={deck.id} depth={depth} />}
            </RollableSection>
        );
    } else {
        return <div></div>;
    }
}
