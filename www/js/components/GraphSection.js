import { html } from '/js/ext/library.js';
import Graph from '/js/components/Graph.js';
import RollableSection from '/js/components/RollableSection.js';

export default function GraphSection({ heading, okToShowGraph, id, depth}) {
  return html`
    <${RollableSection} heading=${ heading }>
      ${ okToShowGraph && html`<${Graph} id=${ id } depth=${ depth } />`}
    </${RollableSection}>`;
}
