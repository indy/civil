import { html, useState } from '/lib/preact/mod.js';

import { capitalise } from '/js/JsUtils.js';
import { svgCaretDown, svgCaretRight} from '/js/svgIcons.js';

import RollableSection from '/js/components/RollableSection.js';
import { ExpandableListingLink } from '/js/components/ListingLink.js';

export default function SectionLinkBack(props) {
  const linkbacks = props.linkbacks || [];
  const sections = [];

  const groupedLinkbacksByResource = groupByResource(linkbacks);
  Object.keys(groupedLinkbacksByResource).forEach(key => {
    const byId = groupLinkbacksById(groupedLinkbacksByResource[key]);
    const section = SectionLinks(byId);
    sections.push(section);
  });

  return html`
    <${RollableSection} heading='Linkbacks'>
      ${ sections }
    </${RollableSection}>`;
}

function groupLinkbacksById(linkbacks) {
  let grouped = {};
  linkbacks.forEach(lb => {
    grouped[lb.id] = grouped[lb.id] || { id: lb.id, name: lb.name, resource: lb.resource, passages: [] };
    grouped[lb.id].passages.push({note_id: lb.note_id, content: lb.content});
  });

  let res = [];
  for (const [key, value] of Object.entries(grouped)) {
    res.push(value);
  }
  // sort res by size of the passages array
  res.sort((a, b) => {
    if (a.passages.length === b.passages.length) {
      let an = a.name.toUpperCase();
      let bn = b.name.toUpperCase();
      return (an < bn) ? -1 : an > bn ? 1 : 0;
    } else {
      return b.passages.length - a.passages.length;
    }
  });

  return res;
}

function groupByResource(linkbacks) {
  // key == resource, value == array of ExpandableListingLink components
  let res = {};
  linkbacks.forEach(lb => {
    res[lb.resource] = res[lb.resource] || [];
    res[lb.resource].push(lb);
  });

  return res;
}

function SectionLinks(linkbacks, heading) {
  const [showExpanded, setShowExpanded] = useState(true);
  let icon = showExpanded ? svgCaretDown() : svgCaretRight();

  function onClickToggle(e) {
    e.preventDefault();
    setShowExpanded(!showExpanded);
  }

  if (!linkbacks || linkbacks.length === 0) {
    return html`<div></div>`;
  }

  let list = linkbacks.map(lb => {
    return html`<${ExpandableListingLink}
                  id=${ lb.id }
                  name=${ lb.name }
                  resource=${ lb.resource }
                  parentExpanded=${showExpanded}
                  passages=${ lb.passages }/>`;
  });

  let sectionHeading = capitalise(heading || linkbacks[0].resource);
  let sectionId = linkbacks[0].id;

  return html`
    <section key=${ sectionId }>
      <h3 onClick=${ onClickToggle }>${ icon } ${ sectionHeading }</h3>
      <ul class="unstyled-list">
        ${ list }
      </ul>
    </section>`;
}
