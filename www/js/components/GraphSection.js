import { html } from '/lib/preact/mod.js';
import Graph from '/js/components/Graph.js';
import { useStateValue } from '/js/StateProvider.js';
import RollableSection from '/js/components/RollableSection.js';

function canShowGraph(state, id) {
  return !!state.graph.links[id];
}

export default function GraphSection({ heading, okToShowGraph, id, depth}) {
  const [state] = useStateValue();

  if (canShowGraph(state, id)) {
    return html`
      <${RollableSection} heading=${ heading } initiallyRolledUp>
        ${ okToShowGraph && html`<${Graph} id=${ id } depth=${ depth }/>`}
      </${RollableSection}>`;
  } else {
    return html`<div></div>`;
  }
}
