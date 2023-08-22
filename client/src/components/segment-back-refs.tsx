import { h, ComponentChildren } from "preact";

import { Font, BackRefDeck, DeckKind, FatDeck, RenderingDeckPart } from "types";

import { buildSlimDeck, deckKindToHeadingString } from "shared/deck";
import { fontClass } from "shared/font";
import { immutableState } from "app-state";

import RollableSegment from "components/rollable-segment";
import ExpandableBackRefListing from "components/expandable-backref-listing";
import Expandable from "components/expandable";

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
                slimDeck={slimDeck}
                deckLevelRefs={br.deckLevelRefs}
                deckLevelAnnotation={br.deckLevelAnnotation}
                backRefNoteSeqs={br.backRefNoteSeqs}
            />
        );
    });

    let segmentHeading: string = deckKindToHeadingString(backrefs[0].deckKind);
    let segmentId = backrefs[0].deckId;

    let headerClass =
        "font-size-2rem " + fontClass(font, RenderingDeckPart.UiInterleaved);

    let heading = <span class={headerClass}>{segmentHeading}</span>;

    return (
        <section key={segmentId}>
            <Expandable heading={heading}>{list}</Expandable>
        </section>
    );
}
