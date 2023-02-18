import { h } from "preact";

import { FatDeck } from "../types";

import { getAppState } from "../AppState";

import Graph from "./Graph";
import RollableSection from "./RollableSection";

export default function SectionGraph({
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
            <RollableSection heading={heading} initiallyRolledUp>
                {okToShowGraph && <Graph id={deck.id} depth={depth} />}
            </RollableSection>
        );
    } else {
        return <div></div>;
    }
}
