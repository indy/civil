import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import {
    BackNote,
    DeckKind,
    FatDeck,
    Key,
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
    id: Key;
    title: string;
    deckInsignia: number;
    deckKind: DeckKind;
    notes: Array<NoteThing>;
    deckLevelRefs: Array<Ref>;
    metaNoteId: Key;
    deckLevelAnnotation?: string;
};

export default function SectionBackRefs({ deck }: { deck?: FatDeck }) {
    const appState = getAppState();

    let backrefs: Array<Ref> = (deck && deck.backrefs) || [];
    let backnotes: Array<BackNote> = (deck && deck.backnotes) || [];

    const sections: Array<ComponentChildren> = [];
    const decks: Array<BackRefSectionItem> = [];

    if (!nonEmptyArray<Ref>(backrefs)) {
        return <div></div>;
    }

    // file into decks with notes
    //
    backnotes.forEach((n: BackNote) => {
        if (decks.length === 0 || decks[decks.length - 1].id !== n.id) {
            let deckThing: BackRefSectionItem = {
                id: n.id,
                title: n.title,
                deckInsignia: n.insignia,
                deckKind: n.deckKind,
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
        backrefs.forEach((br: Ref) => {
            // find the noteId
            for (let i = 0; i < decks.length; i++) {
                let d: BackRefSectionItem = decks[i];

                if (d.metaNoteId === br.noteId) {
                    if (br.id === deck.id) {
                        d.deckLevelAnnotation = br.annotation;
                    } else {
                        let ref: Ref = {
                            noteId: br.noteId,
                            id: br.id,
                            title: br.title,
                            refKind: br.refKind,
                            deckKind: br.deckKind,
                            annotation: br.annotation,
                            insignia: br.insignia,
                        };
                        d.deckLevelRefs.push(ref);
                        break;
                    }
                } else {
                    for (let j = 0; j < d.notes.length; j++) {
                        if (d.notes[j].noteId === br.noteId) {
                            if (br.id === deck.id) {
                                d.notes[j].topRefKind = br.refKind;
                                d.notes[j].topAnnotation = br.annotation;
                            } else {
                                let ref: Ref = {
                                    noteId: br.noteId,
                                    id: br.id,
                                    title: br.title,
                                    refKind: br.refKind,
                                    deckKind: br.deckKind,
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

    // group by deckKind kind
    //
    let groupedByResource = {};
    decks.forEach((d: BackRefSectionItem) => {
        if (!groupedByResource[d.deckKind]) {
            groupedByResource[d.deckKind] = [];
        }
        if (d.metaNoteId) {
            // deck-level back refs should be given priority
            // add them to the front of the array
            groupedByResource[d.deckKind].unshift(d);
        } else {
            // normal per-note back refs are added to the end
            groupedByResource[d.deckKind].push(d);
        }
    });

    // don't use the messy auto-generated quote titles
    // just name them after the deck id
    if (groupedByResource[DeckKind.Quote]) {
        groupedByResource[DeckKind.Quote].forEach((d: BackRefSectionItem) => {
            d.title = `Quote #${d.id}`;
        });
    }

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
                id={br.id}
                title={br.title}
                deckInsignia={br.deckInsignia}
                deckLevelRefs={br.deckLevelRefs}
                deckLevelAnnotation={br.deckLevelAnnotation}
                deckKind={br.deckKind}
                notes={br.notes}
            />
        );
    });

    let sectionHeading: string = deckKindToHeadingString(backrefs[0].deckKind);
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
