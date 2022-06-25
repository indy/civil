import { html } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';
import Graph from '/js/components/Graph.js';
import RollableSection from '/js/components/RollableSection.js';

export default function GraphSection({ heading, okToShowGraph, id, depth}) {
    const [state] = useStateValue();

    if (state.showConnectivityGraph) {
        return html`
        <${RollableSection} heading=${ heading } initiallyRolledUp>
            ${ okToShowGraph && html`<${Graph} id=${ id } depth=${ depth }/>`}
        </${RollableSection}>`;
    } else {
        return html``;
    }
}
