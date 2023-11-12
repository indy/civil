import { useEffect, useState } from "preact/hooks";

import { DeckKind } from "../enums";
import type { SlimDeck, DeckEvent, PointsWithinYears, Point } from "../types";

import Net from "../shared/net";
import { parseDateStringAsYearOnly } from "../shared/time";

import { CivContainer, CivMain } from "./civil-layout";
import RollableSegment from "./rollable-segment";
import DeckLink from "./deck-link";

export default function SegmentPoints({ deck }: { deck: DeckEvent }) {
    let x: Array<Point> = [];
    const [points, setPoints] = useState(x);

    useEffect(() => {
        if (deck.lowerDate && deck.upperDate) {
            const lower = parseDateStringAsYearOnly(deck.lowerDate);
            const upper = parseDateStringAsYearOnly(deck.upperDate);

            if (lower !== undefined && upper !== undefined) {
                Net.get<PointsWithinYears>(
                    `/api/interval/points-within-years/${lower}/${upper}`,
                ).then((res) => {
                    // console.log(res);
                    setPoints(res.points);
                });
            }
        }
    }, [deck.id]);

    const ps: Array<any> = points
        .filter((p) => p.deckId !== deck.id)
        .map((dp) => <MiniPoint key={dp.id} point={dp} />);

    return (
        <RollableSegment
            extraClasses="c-segment-points"
            heading="Other events occuring during this time"
            font={deck.font}
            initiallyRolledUp={true}
        >
            <CivContainer>
                <CivMain>
                    <ul class="unstyled-list hug-left">{ps}</ul>
                </CivMain>
            </CivContainer>
        </RollableSegment>
    );
}

function MiniPoint({ point }: { point: Point }) {
    let linkText: string = "";
    let pointText = `${point.title} ${point.dateTextual}`;
    if (point.locationTextual) {
        pointText += ` ${point.locationTextual}`;
    }
    if (point.deckKind === DeckKind.Event) {
        linkText = pointText;
    } else {
        linkText = `${point.deckTitle} - ${pointText}`;
    }

    // construct a 'fake' SlimDeck based on point data
    // it's title is more informative than a normal SlimDeck
    //
    const slimDeck: SlimDeck = {
        id: point.deckId,
        createdAt: "",
        title: linkText,
        deckKind: point.deckKind,
        graphTerminator: false,
        insignia: point.deckInsignia,
        font: point.deckFont,
        impact: point.deckImpact,
    };

    return (
        <li class="point">
            <DeckLink slimDeck={slimDeck} />
        </li>
    );
}
