import { h } from "preact";
import { useState } from "preact/hooks";

import { capitalise, nonEmptyArray } from "../JsUtils";
import { getAppState } from "../AppState";
import { svgCaretDown, svgCaretRight } from "../svgIcons";

import RollableSection from "./RollableSection";
import { ExpandableListingLink } from "./ListingLink";

export default function SectionBackRefs({ deck }: { deck?: any }) {
    const appState = getAppState();

    let backrefs = (deck && deck.backrefs) || [];
    let backnotes = (deck && deck.backnotes) || [];

    const sections: any = [];
    const decks: any = [];

    if (!nonEmptyArray(backrefs)) {
        return <div></div>;
    }

    // file into decks with notes
    //
    backnotes.forEach((n) => {
        if (decks.length === 0 || decks[decks.length - 1].deckId !== n.deckId) {
            decks.push({
                deckId: n.deckId,
                deckName: n.deckName,
                deckInsignia: n.insignia,
                resource: n.resource,
                notes: [],
                deckLevelRefs: [],
                metaNoteId: 0,
            });
        }

        if (n.noteKind === "NoteDeckMeta") {
            // all refs associated with the NoteDeckMeta note id are rendered differently
            decks[decks.length - 1].metaNoteId = n.noteId;
        } else {
            decks[decks.length - 1].notes.push({
                noteContent: n.noteContent,
                noteId: n.noteId,
                refs: [],
            });
        }
    });

    if (deck) {
        // attach refs to the correct notes
        //
        backrefs.forEach((br) => {
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
                            insignia: br.insignia,
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
                                    annotation: br.annotation,
                                    insignia: br.insignia,
                                });
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
    decks.forEach((d) => {
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
    appState.preferredOrder.forEach((deckKind) => {
        if (groupedByResource[deckKind]) {
            sections.push(
                <SectionLinks backrefs={groupedByResource[deckKind]} />
            );
        }
    });

    return <RollableSection heading="BackRefs">{sections}</RollableSection>;
}

function SectionLinks({ backrefs }: { backrefs?: any }) {
    const [localState, setLocalState] = useState({
        showExpanded: true,
        childrenExpanded: backrefs.map((br) => true),
    });

    let icon = localState.showExpanded ? svgCaretDown() : svgCaretRight();

    function onClickToggle(e: Event) {
        e.preventDefault();

        setLocalState({
            ...localState,
            showExpanded: !localState.showExpanded,
            childrenExpanded: localState.childrenExpanded.map(
                (ce) => !localState.showExpanded
            ),
        });
    }

    function onChildClicked(key: any) {
        setLocalState({
            ...localState,
            childrenExpanded: localState.childrenExpanded.map((c, i) =>
                i === key ? !c : c
            ),
        });
    }

    let list = backrefs.map((br, i) => {
        return (
            <ExpandableListingLink
                index={i}
                onExpandClick={onChildClicked}
                expanded={localState.childrenExpanded[i]}
                deckId={br.deckId}
                deckName={br.deckName}
                deckInsignia={br.deckInsignia}
                deckLevelRefs={br.deckLevelRefs}
                deckLevelAnnotation={br.deckLevelAnnotation}
                resource={br.resource}
                notes={br.notes}
            />
        );
    });

    let sectionHeading = capitalise(backrefs[0].resource);
    let sectionId = backrefs[0].id;

    return (
        <section key={sectionId}>
            <h3 class="ui" onClick={onClickToggle}>
                {icon} {sectionHeading}
            </h3>
            {list}
        </section>
    );
}
