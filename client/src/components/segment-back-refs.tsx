import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { BackRefDeck, DeckKind, FatDeck } from "types";

import { buildSlimDeck, deckKindToHeadingString } from "utils/civil";
import { getAppState } from "app-state";
import { svgCaretDown, svgCaretRight } from "components/svg-icons";

import RollableSegment from "components/rollable-segment";
import { ExpandableBackRefListing } from "components/listing-link";

import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentBackRefs({ deck }: { deck?: FatDeck }) {
    const segments: Array<ComponentChildren> = [];

    if (deck && deck.backRefDecksGroupedByKind) {
        const appState = getAppState();
        const group = deck.backRefDecksGroupedByKind;

        appState.preferredDeckKindOrder.forEach((deckKind: DeckKind) => {
            if (group[deckKind].length > 0) {
                segments.push(<SegmentLinks backrefs={group[deckKind]} />);
            }
        });
    }

    return <RollableSegment heading="BackRefs">{segments}</RollableSegment>;
}

function SegmentLinks({ backrefs }: { backrefs: Array<BackRefDeck> }) {
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
            br.deckId,
            br.title,
            br.deckInsignia
        );

        return (
            <ExpandableBackRefListing
                index={i}
                slimDeck={slimDeck}
                onExpandClick={onChildClicked}
                expanded={localState.childrenExpanded[i]}
                deckLevelRefs={br.deckLevelRefs}
                deckLevelAnnotation={br.deckLevelAnnotation}
                backRefNoteSeqs={br.backRefNoteSeqs}
            />
        );
    });

    let segmentHeading: string = deckKindToHeadingString(backrefs[0].deckKind);
    let segmentId = backrefs[0].deckId;

    return (
        <section key={segmentId}>
            <CivContainer>
                <CivMain>
                    <h3 class="ui" onClick={onClickToggle}>
                        {icon} {segmentHeading}
                    </h3>
                </CivMain>
            </CivContainer>
            {list}
        </section>
    );
}
