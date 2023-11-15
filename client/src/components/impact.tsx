import { type ComponentChildren } from "preact";

import { CivLeft } from "./civil-layout";
import { svgBlank, svgStar } from "./svg-icons";

export function ImpactWithinListing({ impact }: { impact: number }) {
    return (
        <CivLeft extraClasses="left-margin-within-listing">
            {impact > 0 && <ImpactPartial impact={impact} />}
        </CivLeft>
    );
}

export function ImpactPartial({ impact }: { impact: number }) {
    if (impact < 0 || impact > 4) {
        console.error(`impact value of ${impact} is out of range (0..4)`);
    }

    let ratings: Array<ComponentChildren> = [];

    const imp = impact <= 1 ? 0 : impact - 1;

    // pad out with blanks so that it looks correct on small display
    // devices where the parent div will have a float left applied.
    // (see the .star-rating-partial rule for max-width: 800px)
    //
    for (let i = 0; i < 3 - imp; i++) {
        ratings.push(svgBlank());
    }
    for (let i = 0; i < imp; i++) {
        ratings.push(svgStar());
    }

    return <div class="star-rating-partial">{imp > 0 && ratings}</div>;
}
