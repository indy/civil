import { html } from '/lib/preact/mod.js';

import { getAppState } from '/js/AppState.js';

import Graph from '/js/components/Graph.js';
import RollableSection from '/js/components/RollableSection.js';

export default function SectionGraph({ depth, deck }) {
    const appState = getAppState();

    if (appState.showConnectivityGraph.value && deck) {
        const okToShowGraph = (deck.notes && deck.notes.length > 0) || deck.backrefs;
        const heading = (deck.title) ? `Connectivity Graph` : '';

        return html`
        <${RollableSection} heading=${ heading } initiallyRolledUp>
            ${ okToShowGraph && html`<${Graph} id=${ deck.id } depth=${ depth }/>`}
        </${RollableSection}>`;
    } else {
        return html`<div></div>`;
    }
}
