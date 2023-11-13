import { useEffect, useState } from "preact/hooks";

import type { DeckEvent, PointsWithinYears, Point } from "../types";

import Net from "../shared/net";
import { parseDateStringAsYearOnly } from "../shared/time";
import { slimDeckFromPoint } from "../shared/deck";

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
        .map((dp) => (
            <li class="point" key={dp.id}>
                <DeckLink slimDeck={slimDeckFromPoint(dp)} />
            </li>
        ));

    return (
        <RollableSegment
            extraClasses="c-segment-points"
            heading="Other events during this time"
            font={deck.font}
        >
            <CivContainer>
                <CivMain>
                    <ul class="unstyled-list hug-left">{ps}</ul>
                </CivMain>
            </CivContainer>
        </RollableSegment>
    );
}
