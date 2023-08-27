import { ComponentChildren, h } from "preact";

import { Arrival, DeckKind, FatDeck, Font, RenderingDeckPart } from "types";

import { immutableState } from "app-state";
import { deckKindToHeadingString } from "shared/deck";
import { fontClass } from "shared/font";

import Expandable from "components/expandable";
import ViewArrival from "components/view-arrival";
import RollableSegment from "components/rollable-segment";

export default function SegmentArrivals({ deck }: { deck?: FatDeck }) {
    const font = deck ? deck.font : immutableState.defaultFont;

    const allGroups: Array<ComponentChildren> = [];
    if (deck) {
        const group = deck.groupedArrivals;
        immutableState.deckKindOrder.forEach((deckKind: DeckKind) => {
            if (group[deckKind].length > 0) {
                allGroups.push(
                    <GroupedArrivals
                        deck={deck}
                        font={font}
                        arrivals={group[deckKind]}
                    />
                );
            }
        });
    }

    // don't even show the arrivals rollable segment if there are no arrival groups
    const invisible = allGroups.length === 0;

    return (
        <RollableSegment
            extraClasses="c-segment-arrivals"
            heading="Incoming References"
            font={font}
            invisible={invisible}
        >
            {allGroups}
        </RollableSegment>
    );
}

function GroupedArrivals({
    deck,
    arrivals,
    font,
}: {
    deck: FatDeck;
    arrivals: Array<Arrival>;
    font: Font;
}) {
    let list = arrivals.map((arrival) => {
        return <ViewArrival deck={deck} arrival={arrival} />;
    });

    let segmentHeading: string = deckKindToHeadingString(
        arrivals[0].deck.deckKind
    );
    let segmentId = arrivals[0].deck.id;

    let headerClass =
        "font-size-2rem " + fontClass(font, RenderingDeckPart.UiInterleaved);

    let heading = <span class={headerClass}>{segmentHeading}</span>;

    return (
        <section key={segmentId}>
            <Expandable heading={heading}>{list}</Expandable>
        </section>
    );
}
