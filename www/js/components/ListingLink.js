import { html, Link } from '/js/ext/library.js';

export default function ListingLink({ resource, id, name }) {
  const href = `/${resource}/${id}`;

  let res = html`
    <li>
      <${Link} href=${ href }>${ name }</${Link}>
    </li>`;

  return res;
};
