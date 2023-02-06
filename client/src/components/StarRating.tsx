import { h, ComponentChildren } from "preact";
import { svgRatingStar } from "../svgIcons";

function StarRating({ rating }: { rating: number }) {
    return (
        <div class="left-margin left-margin-list-entry">
            {rating > 0 && <StarRatingPartial rating={rating} />}
        </div>
    );
}

function StarRatingPartial({ rating }: { rating: number }) {
    let ratings: Array<ComponentChildren> = [];
    for (let i = 0; i < rating; i++) {
        ratings.push(svgRatingStar());
    }

    return (
        <div class="left-margin-entry-no-note-on-right">
            {rating > 0 && ratings}
        </div>
    );
}

export { StarRating, StarRatingPartial };
