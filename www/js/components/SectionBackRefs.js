import { html, useState } from '/lib/preact/mod.js';

import { capitalise, nonEmptyArray } from '/js/JsUtils.js';
import { getAppState } from '/js/AppState.js';
import { svgCaretDown, svgCaretRight} from '/js/svgIcons.js';

import RollableSection from '/js/components/RollableSection.js';
import { ExpandableListingLink } from '/js/components/ListingLink.js';

export default function SectionBackRefs({ deck }) {
    const appState = getAppState();

    let backrefs = (deck && deck.backrefs) || [];
    let backnotes = (deck && deck.backnotes) || [];

    const sections = [];
    const decks = [];

    if (!nonEmptyArray(backrefs)) {
        return html`<div></div>`;
    }

    // file into decks with notes
    //
    backnotes.forEach(n => {
        if (decks.length === 0 || decks[decks.length - 1].deckId !== n.deckId) {
            decks.push({
                deckId: n.deckId,
                deckName: n.deckName,
                resource: n.resource,
                notes: [],
                deckLevelRefs: [],
                metaNoteId: 0
            });
        }

        if (n.noteKind === "NoteDeckMeta") {
            // all refs associated with the NoteDeckMeta note id are rendered differently
            decks[decks.length - 1].metaNoteId = n.noteId;
        } else {
            decks[decks.length - 1].notes.push({
                noteContent: n.noteContent,
                noteId: n.noteId,
                refs: []
            });
        }
    });

    if (deck) {
        // attach refs to the correct notes
        //
        backrefs.forEach(br => {
            // find the noteId
            for (let i = 0; i < decks.length; i++) {
                let d = decks[i];

                if (d.metaNoteId === br.noteId) {
                    if (br.deckId === deck.id) {
                        d.deckLevelAnnotation = br.annotation;
                    } else {
                        d.deckLevelRefs.push({
                            id: br.deckId,
                            name: br.deckName,
                            refKind: br.refKind,
                            resource: br.resource,
                            annotation: br.annotation,
                            insignia: br.insignia
                        });
                        break;
                    }
                } else {
                    for (let j = 0; j < d.notes.length; j++) {
                        if (d.notes[j].noteId === br.noteId) {
                            if (br.deckId === deck.id) {
                                d.notes[j].topRefKind = br.refKind;
                                d.notes[j].topAnnotation = br.annotation;
                            } else {
                                d.notes[j].refs.push({
                                    id: br.deckId,
                                    name: br.deckName,
                                    refKind: br.refKind,
                                    resource: br.resource,
                                    annotation: br.annotation
                                })
                            }
                            break;
                        }
                    }
                }
            }
        });
    }

    // group by resource kind
    //
    let groupedByResource = {};
    decks.forEach(d => {
        if (!groupedByResource[d.resource]) {
            groupedByResource[d.resource] = [];
        }
        if (d.metaNoteId) {
            // deck-level back refs should be given priority
            // add them to the front of the array
            groupedByResource[d.resource].unshift(d);
        } else {
            // normal per-note back refs are added to the end
            groupedByResource[d.resource].push(d);
        }

    });

    // render in the preferred order
    //
    appState.preferredOrder.forEach(deckKind => {
        if (groupedByResource[deckKind]) {
            sections.push(html`<${SectionLinks} backrefs=${groupedByResource[deckKind]} />`);
        }
    });

    return html`
    <${RollableSection} heading='BackRefs'>
      ${ sections }
    </${RollableSection}>`;
}

function SectionLinks({ backrefs }) {
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
        return html`
        <${ExpandableListingLink} index=${i}
                                  onExpandClick=${onChildClicked}
                                  expanded=${ localState.childrenExpanded[i] }
                                  deckId=${ br.deckId }
                                  deckName=${ br.deckName }
                                  deckInsignia=${br.insignia}
                                  deckLevelRefs=${ br.deckLevelRefs }
                                  deckLevelAnnotation=${ br.deckLevelAnnotation }
                                  resource=${ br.resource }
                                  notes=${ br.notes }/>`;
    });

    let sectionHeading = capitalise(backrefs[0].resource);
    let sectionId = backrefs[0].id;

    return html`
    <section key=${ sectionId }>
        <h3 class="ui" onClick=${ onClickToggle }>${ icon } ${ sectionHeading }</h3>
        ${ list }
    </section>`;
}
