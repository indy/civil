import { html, useState } from '/lib/preact/mod.js';

import { capitalise, nonEmptyArray } from '/js/JsUtils.js';
import { getAppState } from '/js/AppStateProvider.js';
import { svgCaretDown, svgCaretRight} from '/js/svgIcons.js';

import RollableSection from '/js/components/RollableSection.js';
import { ExpandableListingLink } from '/js/components/ListingLink.js';

export default function SectionBackRefs({ deckId }) {
    const appState = getAppState();

    let backrefs = (appState.deckManagerState.value.deck && appState.deckManagerState.value.deck.backrefs) || [];
    let backnotes = (appState.deckManagerState.value.deck && appState.deckManagerState.value.deck.backnotes) || [];

    const sections = [];
    const decks = [];

    // isg todo: People.js also had a check of nonEmptyArray(backnotes)

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

    // attach refs to the correct notes
    //
    backrefs.forEach(br => {
        // find the noteId
        for (let i = 0; i < decks.length; i++) {
            let d = decks[i];

            if (d.metaNoteId === br.noteId) {
                if (br.deckId === deckId) {
                    d.deckLevelAnnotation = br.annotation;
                } else {
                    d.deckLevelRefs.push({
                        id: br.deckId,
                        name: br.deckName,
                        refKind: br.refKind,
                        resource: br.resource,
                        annotation: br.annotation
                    });
                    break;
                }
            } else {
                for (let j = 0; j < d.notes.length; j++) {
                    if (d.notes[j].noteId === br.noteId) {
                        if (br.deckId === deckId) {
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
