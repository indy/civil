import { html, useState } from '/lib/preact/mod.js';
import { svgChevronDoubleDown, svgChevronDoubleRight} from '/js/svgIcons.js';

import ListingLink from '/js/components/ListingLink.js';
import { capitalise } from '/js/JsUtils.js';

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
    <div>
      ${ sections }
    </div>`;
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
  // key == resource, value == array of ListingLink components
  let res = {};
  linkbacks.forEach(lb => {
    res[lb.resource] = res[lb.resource] || [];
    res[lb.resource].push(lb);
  });

  return res;
}

function SectionLinks(linkbacks, heading) {
  const [showExpanded, setShowExpanded] = useState(true);
  let icon = showExpanded ? svgChevronDoubleDown() : svgChevronDoubleRight();

  function onClickToggle(e) {
    e.preventDefault();
    setShowExpanded(!showExpanded);
  }

  if (!linkbacks || linkbacks.length === 0) {
    return html`<div></div>`;
  }

  let list = linkbacks.map(lb => {
    return html`<${ListingLink}
                  id=${ lb.id }
                  name=${ lb.name }
                  resource=${ lb.resource }
                  passages=${ showExpanded && lb.passages }/>`;
  });

  let sectionHeading = capitalise(heading || linkbacks[0].resource);
  let sectionId = linkbacks[0].id;

  return html`
    <section key=${ sectionId }>
<div>
      <div class="spanne">
        <div class="spanne-entry clickable" onClick=${ onClickToggle }>
          ${ icon }
        </div>
      </div>
      <h2 onClick=${ onClickToggle }>${ sectionHeading }</h2>
</div>
      <ul>
        ${ list }
      </ul>

    </section>`;
}
