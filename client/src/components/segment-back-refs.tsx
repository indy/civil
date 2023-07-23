import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { BackRefDeck, DeckKind, FatDeck, RenderingDeckPart } from "types";

import {
    buildSlimDeck,
    deckKindToHeadingString,
    typefaceClass,
} from "utils/civil";
import { immutableState } from "app-state";
import { svgCaretDown, svgCaretRight } from "components/svg-icons";

import RollableSegment from "components/rollable-segment";
import ExpandableBackRefListing from "components/expandable-backref-listing";

import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentBackRefs({ deck }: { deck?: FatDeck }) {
    const typeface = deck ? deck.typeface : immutableState.defaultTypeface;

    const backrefGroups: Array<ComponentChildren> = [];
    if (deck && deck.backRefDecksGroupedByKind) {
        const group = deck.backRefDecksGroupedByKind;

        immutableState.deckKindOrder.forEach((deckKind: DeckKind) => {
            if (group[deckKind].length > 0) {
                backrefGroups.push(
                    <BackRefGroup
                        typeface={typeface}
                        backrefs={group[deckKind]}
                    />
                );
            }
        });
    }

    // don't even show the backrefs rollable segment if there are no backref groups
    const invisible = backrefGroups.length === 0;

    return (
        <RollableSegment
            heading="BackRefs"
            typeface={typeface}
            invisible={invisible}
            interleaved
        >
            {backrefGroups}
        </RollableSegment>
    );
}

function BackRefGroup({
    backrefs,
    typeface,
}: {
    backrefs: Array<BackRefDeck>;
    typeface: string;
}) {
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
            br.deckInsignia,
            br.deckTypeface
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

    let headerClass = typefaceClass(typeface, RenderingDeckPart.UiInterleaved);

    return (
        <section key={segmentId}>
            <CivContainer>
                <CivMain>
                    <h3 class={headerClass} onClick={onClickToggle}>
                        {icon} {segmentHeading}
                    </h3>
                </CivMain>
            </CivContainer>
            {list}
        </section>
    );
}
