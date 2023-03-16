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
} from "types";

import { buildSlimDeck, deckKindToHeadingString } from "utils/civil";
import { getAppState } from "app-state";
import { nonEmptyArray } from "utils/js";
import { svgCaretDown, svgCaretRight } from "components/svg-icons";

import RollableSegment from "components/rollable-segment";
import { ExpandableListingLink } from "components/listing-link";

type BackRefItem = {
    id: Key;
    title: string;
    deckInsignia: number;
    deckKind: DeckKind;
    notes: Array<NoteThing>;
    deckLevelRefs: Array<Ref>;
    metaNoteId: Key;
    deckLevelAnnotation?: string;
};

export default function SegmentBackRefs({ deck }: { deck?: FatDeck }) {
    const appState = getAppState();

    let backrefs: Array<Ref> = (deck && deck.backrefs) || [];
    let backnotes: Array<BackNote> = (deck && deck.backnotes) || [];

    const segments: Array<ComponentChildren> = [];
    const decks: Array<BackRefItem> = [];

    if (!nonEmptyArray<Ref>(backrefs)) {
        return <div></div>;
    }

    // file into decks with notes
    //
    backnotes.forEach((n: BackNote) => {
        if (decks.length === 0 || decks[decks.length - 1].id !== n.id) {
            let deckThing: BackRefItem = {
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
                let d: BackRefItem = decks[i];

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
    decks.forEach((d: BackRefItem) => {
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
        groupedByResource[DeckKind.Quote].forEach((d: BackRefItem) => {
            d.title = `Quote #${d.id}`;
        });
    }

    // render in the preferred order
    //
    appState.preferredDeckKindOrder.forEach((deckKind: DeckKind) => {
        if (groupedByResource[deckKind]) {
            segments.push(
                <SegmentLinks backrefs={groupedByResource[deckKind]} />
            );
        }
    });

    return <RollableSegment heading="BackRefs">{segments}</RollableSegment>;
}

function SegmentLinks({ backrefs }: { backrefs: Array<BackRefItem> }) {
    const [localState, setLocalState] = useState({
        showExpanded: true,
        childrenExpanded: backrefs.map(() => true),
    });

    let icon = localState.showExpanded ? svgCaretDown() : svgCaretRight();

    function onClickToggle(e: Event) {
        e.preventDefault();

        setLocalState({
            ...localState,
            showExpanded: !localState.showExpanded,
            childrenExpanded: localState.childrenExpanded.map(
                () => !localState.showExpanded
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
        const slimDeck = buildSlimDeck(
            br.deckKind,
            br.id,
            br.title,
            br.deckInsignia
        );

        return (
            <ExpandableListingLink
                index={i}
                slimDeck={slimDeck}
                onExpandClick={onChildClicked}
                expanded={localState.childrenExpanded[i]}
                deckLevelRefs={br.deckLevelRefs}
                deckLevelAnnotation={br.deckLevelAnnotation}
                notes={br.notes}
            />
        );
    });

    let segmentHeading: string = deckKindToHeadingString(backrefs[0].deckKind);
    let segmentId = backrefs[0].id;

    return (
        <section key={segmentId}>
            <h3 class="ui" onClick={onClickToggle}>
                {icon} {segmentHeading}
            </h3>
            {list}
        </section>
    );
}
