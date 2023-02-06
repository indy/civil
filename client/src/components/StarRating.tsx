import { h } from "preact";
import { svgRatingStar } from "../svgIcons";

function StarRating({ rating }: { rating?: any }) {
    if (!rating) {
        return <span></span>;
    }

    return (
        <div class="left-margin left-margin-list-entry">
            <StarRatingPartial rating={rating} />
        </div>
    );
}

function StarRatingPartial({ rating }: { rating?: any }) {
    if (!rating) {
        return <span></span>;
    }

    let ratings: any = [];
    for (let i = 0; i < rating; i++) {
        ratings.push(svgRatingStar());
    }

    return <div class="left-margin-entry-no-note-on-right">{ratings}</div>;
}

export { StarRating, StarRatingPartial };
