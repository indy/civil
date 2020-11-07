import { html } from '/lib/preact/mod.js';
import { svgRatingStar } from '/js/svgIcons.js';

export default function SpanneStarRating({ rating }) {
  if (!rating) {
    return html``;
  }

  let ratings = [];
  for (let i = 0; i < rating; i++) {
    ratings.push(svgRatingStar());
  }
  return html`<div class="spanne spanne-in-listing">
                <div class="spanne-entry">
                  ${ratings}
                </div>
              </div>`;
}
