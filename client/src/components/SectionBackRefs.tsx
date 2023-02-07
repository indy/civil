import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import {
    BackNote,
    BackRef,
    DeckKind,
    IDeckCore,
    NoteKind,
    NoteThing,
    Ref,
} from "../types";

import { deckKindToHeadingString } from "../CivilUtils";
import { getAppState } from "../AppState";
import { nonEmptyArray } from "../JsUtils";
import { svgCaretDown, svgCaretRight } from "../svgIcons";

import RollableSection from "./RollableSection";
import { ExpandableListingLink } from "./ListingLink";

type BackRefSectionItem = {
    deckId: number;
    deckName: string;
    deckInsignia: number;
    resource: DeckKind;
    notes: Array<NoteThing>;
    deckLevelRefs: Array<Ref>;
    metaNoteId: number;
    deckLevelAnnotation?: string;
};

export default function SectionBackRefs({ deck }: { deck?: IDeckCore }) {
    const appState = getAppState();

    let backrefs: Array<BackRef> = (deck && deck.backrefs) || [];
    let backnotes: Array<BackNote> = (deck && deck.backnotes) || [];

    const sections: Array<ComponentChildren> = [];
    const decks: Array<BackRefSectionItem> = [];

    if (!nonEmptyArray(backrefs)) {
        return <div></div>;
    }

    // file into decks with notes
    //
    backnotes.forEach((n: BackNote) => {
        if (decks.length === 0 || decks[decks.length - 1].deckId !== n.deckId) {
            let deckThing: BackRefSectionItem = {
                deckId: n.deckId,
                deckName: n.deckName,
                deckInsignia: n.insignia,
                resource: n.resource,
                notes: [],
                deckLevelRefs: [],
                metaNoteId: 0,
            };
            decks.push(deckThing);
        }

        if (n.noteKind === NoteKind.NoteDeckMeta) {
            // all refs associated with the NoteDeckMeta note id are rendered differently
            decks[decks.length - 1].metaNoteId = n.noteId;
        } else {
            let noteThing: NoteThing = {
                noteContent: n.noteContent,
                noteId: n.noteId,
                refs: [],
            };
            decks[decks.length - 1].notes.push(noteThing);
        }
    });

    if (deck) {
        // attach refs to the correct notes
        //
        backrefs.forEach((br: BackRef) => {
            // find the noteId
            for (let i = 0; i < decks.length; i++) {
                let d: BackRefSectionItem = decks[i];

                if (d.metaNoteId === br.noteId) {
                    if (br.deckId === deck.id) {
                        d.deckLevelAnnotation = br.annotation;
                    } else {
                        let ref: Ref = {
                            noteId: br.noteId,
                            id: br.deckId,
                            name: br.deckName,
                            refKind: br.refKind,
                            resource: br.resource,
                            annotation: br.annotation,
                            insignia: br.insignia,
                        };
                        d.deckLevelRefs.push(ref);
                        break;
                    }
                } else {
                    for (let j = 0; j < d.notes.length; j++) {
                        if (d.notes[j].noteId === br.noteId) {
                            if (br.deckId === deck.id) {
                                d.notes[j].topRefKind = br.refKind;
                                d.notes[j].topAnnotation = br.annotation;
                            } else {
                                let ref: Ref = {
                                    noteId: br.noteId,
                                    id: br.deckId,
                                    name: br.deckName,
                                    refKind: br.refKind,
                                    resource: br.resource,
                                    annotation: br.annotation,
                                    insignia: br.insignia,
                                };
                                d.notes[j].refs.push(ref);
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
    decks.forEach((d: BackRefSectionItem) => {
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
    appState.preferredDeckKindOrder.forEach((deckKind: DeckKind) => {
        if (groupedByResource[deckKind]) {
            sections.push(
                <SectionLinks backrefs={groupedByResource[deckKind]} />
            );
        }
    });

    return <RollableSection heading="BackRefs">{sections}</RollableSection>;
}

function SectionLinks({ backrefs }: { backrefs: Array<BackRefSectionItem> }) {
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

    function onChildClicked(key: number) {
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

    let sectionHeading: string = deckKindToHeadingString(backrefs[0].resource);
    let sectionId = backrefs[0].deckId;

    return (
        <section key={sectionId}>
            <h3 class="ui" onClick={onClickToggle}>
                {icon} {sectionHeading}
            </h3>
            {list}
        </section>
    );
}
