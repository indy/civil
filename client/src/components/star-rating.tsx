import { h, ComponentChildren } from "preact";

import { svgRatingStar, svgBlank } from "components/svg-icons";

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

    // pad out with blanks so that it looks correct on small display
    // devices where the parent div will have a float left applied.
    // (see the .star-rating-partial rule for max-width: 800px)
    //
    for (let i = 0; i < 5 - rating; i++) {
        ratings.push(svgBlank());
    }
    for (let i = 0; i < rating; i++) {
        ratings.push(svgRatingStar());
    }

    return <div class="star-rating-partial">{rating > 0 && ratings}</div>;
}

export { StarRatingWithinListing, StarRatingPartial };
