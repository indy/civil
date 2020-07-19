import { html } from '/js/ext/library.js';

import ListingLink from '/js/components/ListingLink.js';
import { capitalise } from '/js/lib/JsUtils.js';

export default function SectionLinkBack(props) {
  const linkbacks = props.linkbacks || [];
  const sections = [];
  const groupedLinkbacks = groupByResource(linkbacks);

  Object.keys(groupedLinkbacks).forEach(key => {
    let section = listingLinks(groupedLinkbacks[key]);
    sections.push(section);
  });

  return html`
    <div>
      ${ sections }
    </div>`;
}

function groupByResource(linkbacks) {
  // key == resource, value == array of ListingLink components
  let res = {};
  linkbacks.forEach(lb => {
    res[lb.resource] = res[lb.resource] || [];
    res[lb.resource].push(lb);
  });

  return res;
}

function listingLinks(linkbacks, heading) {
  if (linkbacks.length === 0) {
    return html`<div></div>`;
  }

  let list = linkbacks.map(buildLinkback);
  let sectionHeading = capitalise(heading || linkbacks[0].resource);
  let sectionId = linkbacks[0].id;

  return html`
    <section key=${ sectionId }>
      <h2>${ sectionHeading }</h2>
      <ul>
        ${ list }
      </ul>
    </section>`;
}

function buildLinkback(lb) {
  return html`<${ListingLink} id=${ lb.id } name=${ lb.name } resource=${ lb.resource }/>`;
}
