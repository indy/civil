import { ComponentChildren, h } from "preact";

import { BackDeck, DeckKind, FatDeck, Font, RenderingDeckPart } from "types";

import { immutableState } from "app-state";
import { deckKindToHeadingString } from "shared/deck";
import { fontClass } from "shared/font";

import Expandable from "components/expandable";
import ViewBackDeck from "components/view-back-deck";
import RollableSegment from "components/rollable-segment";

export default function SegmentBackDecks({ deck }: { deck?: FatDeck }) {
    const font = deck ? deck.font : immutableState.defaultFont;

    const allGroups: Array<ComponentChildren> = [];
    if (deck) {
        const group = deck.backDecksGrouped;
        immutableState.deckKindOrder.forEach((deckKind: DeckKind) => {
            if (group[deckKind].length > 0) {
                allGroups.push(
                    <GroupedBackDecks
                        deck={deck}
                        font={font}
                        backDecks={group[deckKind]}
                    />
                );
            }
        });
    }

    // don't even show the backdecks rollable segment if there are no backdeck groups
    const invisible = allGroups.length === 0;

    return (
        <RollableSegment
            extraClasses="c-segment-back-refs"
            heading="BackDecks"
            font={font}
            invisible={invisible}
        >
            {allGroups}
        </RollableSegment>
    );
}

function GroupedBackDecks({
    deck,
    backDecks,
    font,
}: {
    deck: FatDeck;
    backDecks: Array<BackDeck>;
    font: Font;
}) {
    let list = backDecks.map((backDeck) => {
        return <ViewBackDeck deck={deck} backDeck={backDeck} />;
    });

    let segmentHeading: string = deckKindToHeadingString(
        backDecks[0].deck.deckKind
    );
    let segmentId = backDecks[0].deck.id;

    let headerClass =
        "font-size-2rem " + fontClass(font, RenderingDeckPart.UiInterleaved);

    let heading = <span class={headerClass}>{segmentHeading}</span>;

    return (
        <section key={segmentId}>
            <Expandable heading={heading}>{list}</Expandable>
        </section>
    );
}
