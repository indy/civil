import { html } from '/lib/preact/mod.js';
import { svgRatingStar } from '/js/svgIcons.js';

function SpanneStarRating({ rating }) {
  if (!rating) {
    return html``;
  }

  return html`<div class="spanne spanne-in-listing">
                <${SpanneStarRatingPartial} rating=${rating}/>
              </div>`;
}

function SpanneStarRatingPartial({ rating }) {
  if (!rating) {
    return html``;
  }

  let ratings = [];
  for (let i = 0; i < rating; i++) {
    ratings.push(svgRatingStar());
  }

  return html`<div class="spanne-entry">${ratings}</div>`;
}


export { SpanneStarRating, SpanneStarRatingPartial };
