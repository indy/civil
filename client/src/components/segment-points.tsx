import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { DeckKind, RenderingDeckPart } from "../enums";

import type { DeckEvent, PointsWithinYears, Point } from "../types";

import Net from "../shared/net";
import { parseDateStringAsYearOnly } from "../shared/time";
import { buildUrl } from "../shared/civil";
import { fontClass } from "../shared/font";
import { deckKindToResourceString } from "../shared/deck";

import RollableSegment from "./rollable-segment";
import { svgBlank } from "./svg-icons";

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
            heading="All points occuring during the event"
            font={deck.font}
            initiallyRolledUp={true}
        >
            {ps}
        </RollableSegment>
    );
}

function MiniPoint({ point }: { point: Point }) {
    let klass = fontClass(point.font, RenderingDeckPart.Heading);

    let pointText = `${point.title} ${point.dateTextual}`;
    if (point.locationTextual) {
        pointText += ` ${point.locationTextual}`;
    }

    klass += ` point`;

    const dk: string = deckKindToResourceString(point.deckKind);
    const linkColour = `pigment-fg-${dk}`;

    // don't apply to events since their single point will have the same text as the deck title
    //
    let linkText =
        point.deckKind === DeckKind.Event
            ? pointText
            : `${point.deckTitle} - ${pointText}`;

    return (
        <li class={klass}>
            <Link
                class={linkColour}
                href={buildUrl(point.deckKind, point.deckId)}
            >
                {svgBlank()}
                {linkText}
            </Link>
        </li>
    );
}
