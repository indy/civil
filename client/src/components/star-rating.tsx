import { h, ComponentChildren } from "preact";

import { svgRatingStar } from "components/svg-icons";

import { CivLeft } from "components/civil-layout";

function StarRatingWithinListing({ rating }: { rating: number }) {
    return (
        <CivLeft extraClasses="left-margin-within-listing">
            {rating > 0 && <StarRatingPartial rating={rating} />}
        </CivLeft>
    );
}

function StarRatingPartial({ rating }: { rating: number }) {
    let ratings: Array<ComponentChildren> = [];
    for (let i = 0; i < rating; i++) {
        ratings.push(svgRatingStar());
    }

    return <div>{rating > 0 && ratings}</div>;
}

export { StarRatingWithinListing, StarRatingPartial };
