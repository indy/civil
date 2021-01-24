import { html } from '/lib/preact/mod.js';
import { svgRatingStar } from '/js/svgIcons.js';

function StarRating({ rating }) {
  if (!rating) {
    return html``;
  }

  return html`<div class="left-margin left-margin-list-entry">
                <${StarRatingPartial} rating=${rating}/>
              </div>`;
}

function StarRatingPartial({ rating }) {
  if (!rating) {
    return html``;
  }

  let ratings = [];
  for (let i = 0; i < rating; i++) {
    ratings.push(svgRatingStar());
  }

  return html`<div class="left-margin-entry">${ratings}</div>`;
}


export { StarRating, StarRatingPartial };
