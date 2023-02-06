import { h } from "preact";

import { getAppState } from '../AppState';

// import Graph from '/js/components/Graph.js';
import RollableSection from './RollableSection';

export default function SectionGraph({ depth, deck }: { depth?: any, deck?: any }) {
    const appState = getAppState();

    if (appState.showConnectivityGraph.value && deck) {
        const okToShowGraph = (deck.notes && deck.notes.length > 0) || deck.backrefs;
        const heading = (deck.title) ? `Connectivity Graph` : '';

        // todo: this was the original code:
        //             { okToShowGraph && html`<{Graph} id={ deck.id } depth={ depth }/>`}
        return (
        <RollableSection heading={ heading } initiallyRolledUp>
            { okToShowGraph && <div>PLACEHOLDER for Graph component</div>}
        </RollableSection>);
    } else {
        return <div></div>;
    }
}
