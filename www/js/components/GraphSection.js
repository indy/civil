import { html } from '/lib/preact/mod.js';
import Graph from '/js/components/Graph.js';
import RollableSection from '/js/components/RollableSection.js';

export default function GraphSection({ heading, okToShowGraph, id, depth}) {
  return html`
    <${RollableSection} heading=${ heading } initiallyRolledUp>
      ${ okToShowGraph && html`<${Graph} id=${ id } depth=${ depth } />`}
    </${RollableSection}>`;
}
