import { html, useState } from '/lib/preact/mod.js';

import { capitalise, nonEmptyArray } from '/js/JsUtils.js';
import { svgCaretDown, svgCaretRight} from '/js/svgIcons.js';

import RollableSection from '/js/components/RollableSection.js';
import { ExpandableListingLink } from '/js/components/ListingLink.js';

export default function SectionBackRefs({ state, backrefs, backnotes, deckId }) {
  const sections = [];

  const decks = [];

  // isg todo: People.js also had a check of nonEmptyArray(backnotes)

  if (!nonEmptyArray(backrefs)) {
    return html`<div></div>`;
  }

  // file into decks with notes
  //
  backnotes.forEach(n => {
    if (decks.length === 0 || decks[decks.length - 1].deck_id !== n.deck_id) {
      decks.push({
        deck_id: n.deck_id,
        deck_name: n.deck_name,
        resource: n.resource,
        notes: []
      });
    }

    decks[decks.length - 1].notes.push({
      note_content: n.note_content,
      note_id: n.note_id,
      refs: []
    });
  });

  // attach refs to the correct notes
  //
  backrefs.forEach(br => {
    // find the note_id
    for (let i = 0; i < decks.length; i++) {
      let d = decks[i];
      for (let j = 0; j < d.notes.length; j++) {
        if (d.notes[j].note_id === br.note_id) {
          if (br.deck_id === deckId) {
            d.notes[j].top_ref_kind = br.ref_kind;
            d.notes[j].top_annotation = br.annotation;
          } else {
            d.notes[j].refs.push({
              deck_id: br.deck_id,
              deck_name: br.deck_name,
              ref_kind: br.ref_kind,
              resource: br.resource,
              annotation: br.annotation
            })
          }
          break;
        }
      }
    }
  });

  // group by resource kind
  //
  let groupedByResource = {};
  decks.forEach(d => {
    if (!groupedByResource[d.resource]) {
      groupedByResource[d.resource] = [];
    }
    groupedByResource[d.resource].push(d);
  });

  // render in the preferred order
  //
  state.preferredOrder.forEach(deckKind => {
    if (groupedByResource[deckKind]) {
      sections.push(SectionLinks(groupedByResource[deckKind]));
    }
  });

  return html`
    <${RollableSection} heading='BackRefs'>
      ${ sections }
    </${RollableSection}>`;

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
                  deck_id=${ br.deck_id }
                  deck_name=${ br.deck_name }
                  resource=${ br.resource }
                  notes=${ br.notes }/>`;
  });

  let sectionHeading = capitalise(heading || backrefs[0].resource);
  let sectionId = backrefs[0].id;

  return html`
    <section key=${ sectionId }>
      <h3 onClick=${ onClickToggle }>${ icon } ${ sectionHeading }</h3>
      ${ list }
    </section>`;
}
