import { html, useState } from '/lib/preact/mod.js';

import { capitalise } from '/js/JsUtils.js';
import { svgCaretDown, svgCaretRight} from '/js/svgIcons.js';

import RollableSection from '/js/components/RollableSection.js';
import { ExpandableListingLink } from '/js/components/ListingLink.js';

export default function SectionBackRefs({ backrefs }) {
  const sections = [];

  const groupedBackRefsByResource = groupByResource(backrefs);
  Object.keys(groupedBackRefsByResource).forEach(key => {
    const byId = groupBackRefsById(groupedBackRefsByResource[key]);
    const section = SectionLinks(byId);
    sections.push(section);
  });

  return html`
    <${RollableSection} heading='BackRefs'>
      ${ sections }
    </${RollableSection}>`;
}

function groupBackRefsById(backrefs) {
  let grouped = {};
  backrefs.forEach(lb => {
    grouped[lb.id] = grouped[lb.id] || { id: lb.id, name: lb.name, resource: lb.resource, passages: [] };
    grouped[lb.id].passages.push(lb);
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

function groupByResource(backrefs) {
  // key == resource, value == array of ExpandableListingLink components
  let res = {};
  backrefs.forEach(br => {
    res[br.resource] = res[br.resource] || [];
    res[br.resource].push(br);
  });

  return res;
}

function SectionLinks(backrefs, heading) {
  const [localState, setLocalState] = useState({
    showExpanded: true,
    childrenExpanded: backrefs.map(br => true)
  });

  let icon = localState.showExpanded ? svgCaretDown() : svgCaretRight();

  function onClickToggle(e) {
    e.preventDefault();

    setLocalState({
      ...localState,
      showExpanded: !localState.showExpanded,
      childrenExpanded: localState.childrenExpanded.map(ce => !localState.showExpanded)
    });
  }

  function onChildClicked(key) {
    setLocalState({
      ...localState,
      childrenExpanded: localState.childrenExpanded.map((c, i) => i === key ? !c : c)
    });
  }

  let list = backrefs.map((br, i) => {
    return html`<${ExpandableListingLink}
                  index=${i}
                  onExpandClick=${onChildClicked}
                  expanded=${ localState.childrenExpanded[i] }
                  id=${ br.id }
                  name=${ br.name }
                  resource=${ br.resource }
                  passages=${ br.passages }/>`;
  });

  let sectionHeading = capitalise(heading || backrefs[0].resource);
  let sectionId = backrefs[0].id;

  return html`
    <section key=${ sectionId }>
      <h3 onClick=${ onClickToggle }>${ icon } ${ sectionHeading }</h3>
      <ul class="unstyled-list">
        ${ list }
      </ul>
    </section>`;
}
