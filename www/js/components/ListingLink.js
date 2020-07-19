import { h } from '/js/ext/preact.module.js';
import htm from '/js/ext/htm.js';
import { Link } from '/js/ext/preact-router.js';

export default function ListingLink({ resource, id, name }) {
  const html = htm.bind(h);

  const href = `/${resource}/${id}`;

  let res = html`
    <li>
      <${Link} activeClassName="active" href=${ href }>${ name }</${Link}>
    </li>`;

  return res;
};
