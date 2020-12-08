import { html, Link, useState } from '/lib/preact/mod.js';

import { svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';
import { useStateValue } from '/js/StateProvider.js';

import buildMarkup from '/js/components/BuildMarkup.js';

function ListingLink({ resource, id, name }) {
  const href = `/${resource}/${id}`;

  let res = html`
    <li class="listing-link">
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
    </li>`;

  return res;
};

function ExpandableListingLink({ resource, id, name, passages, parentExpanded }) {
  let [expanded, setExpanded] = useState(true);

  function onClicked(e) {
    e.preventDefault();
    if (parentExpanded) {
      setExpanded(!expanded);
    }
  }

  const href = `/${resource}/${id}`;

  let icon;
  if (parentExpanded) {
    icon = expanded ? svgCaretDown() : svgCaretRight();
  } else {
    icon = svgCaretRightEmpty();
  }

  let res = html`
    <li class="listing-link">
      <span onClick=${onClicked}>${ icon }</span>
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
      ${ parentExpanded && expanded && buildPassages(passages) }
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

export { ListingLink, ExpandableListingLink };
