import { html, Link, useState } from '/lib/preact/mod.js';

import { svgCaretRight, svgCaretDown } from '/js/svgIcons.js';
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

function ExpandableListingLink({ index, resource, id, name, passages, expanded, onExpandClick }) {
  function onClicked(e) {
    e.preventDefault();
    onExpandClick(index);
  }

  const href = `/${resource}/${id}`;

  let icon = expanded ? svgCaretDown() : svgCaretRight();

  let res = html`
    <li class="listing-link">
      <span onClick=${onClicked}>${ icon }</span>
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
      ${ expanded && buildPassages(passages) }
    </li>`;

  return res;
};

function buildPassages(passages) {
  const [state] = useStateValue();

  let res = passages.reduce((a, passage) => {
    if (passage.annotation) {
      a.push(html`<div class="ref-top-scribble">
                    ${ passage.annotation }
                  </div>`);
    }
    // if (passage.annotation) {
    //   a.push(html`<div class="left-margin">
    //                 <div class="left-margin-entry-backref">
    //                   <div class="ref-scribble pigment-fg-${ passage.resource }">
    //                     ${ passage.annotation }
    //                   </div>
    //                 </div>
    //               </div>`);
    // }
    a.push(buildMarkup(passage.note_content, state.imageDirectory));
    a.push(html`<hr/>`);
    return a;
  }, []).slice(0, -1);


  return html`<div>${res}</div>`;
}

export { ListingLink, ExpandableListingLink };
