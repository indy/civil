import { html, Link } from '/lib/preact/mod.js';

export default function ListingLink({ resource, id, name }) {
  const href = `/${resource}/${id}`;

  let res = html`
    <li>
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
    </li>`;

  return res;
};
