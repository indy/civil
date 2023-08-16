import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { Font, BackRefDeck, DeckKind, FatDeck, RenderingDeckPart } from "types";

import { buildSlimDeck, deckKindToHeadingString } from "shared/deck";
import { fontClass } from "shared/font";
import { immutableState } from "app-state";
import { svgCaretDown, svgCaretRight } from "components/svg-icons";

import RollableSegment from "components/rollable-segment";
import ExpandableBackRefListing from "components/expandable-backref-listing";

import { CivContainer, CivMain } from "components/civil-layout";

export default function SegmentBackRefs({ deck }: { deck?: FatDeck }) {
    const font = deck ? deck.font : immutableState.defaultFont;

    const backrefGroups: Array<ComponentChildren> = [];
    if (deck) {
        const group = deck.backRefDecksGroupedByKind;
        immutableState.deckKindOrder.forEach((deckKind: DeckKind) => {
            if (group[deckKind].length > 0) {
                backrefGroups.push(
                    <BackRefGroup font={font} backrefs={group[deckKind]} />
                );
            }
        });
    }

    // don't even show the backrefs rollable segment if there are no backref groups
    const invisible = backrefGroups.length === 0;

    return (
        <RollableSegment
            extraClasses="c-segment-back-refs"
            heading="BackRefs"
            font={font}
            invisible={invisible}
        >
            {backrefGroups}
        </RollableSegment>
    );
}

function BackRefGroup({
    backrefs,
    font,
}: {
    backrefs: Array<BackRefDeck>;
    font: Font;
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
            br.deckFont
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

    let headerClass = fontClass(font, RenderingDeckPart.UiInterleaved);

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
