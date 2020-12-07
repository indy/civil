import { html, Link } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import buildMarkup from '/js/components/BuildMarkup.js';

export default function ListingLink({ resource, id, name, passages }) {
  const href = `/${resource}/${id}`;

  let res = html`
    <li class="listing-link 2pigment-fg-${resource}">
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
      ${ passages && buildPassages(passages) }
    </li>`;

  return res;
};

function buildPassages(passages) {
  const [state] = useStateValue();

  return passages.reduce((a, b) => {
    a.push(buildMarkup(b.content, state.imageDirectory));
    a.push(html`<hr/>`);
    return a;
  }, []).slice(0, -1);
}
