import type { DeckArticle, SlimDeck } from "../types";

import { StarRatingWithinListing } from "./star-rating";
import DeckLink from "./deck-link";

export function listItemSlimDeck(slimdeck: SlimDeck, i: number) {
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <StarRatingWithinListing rating={slimdeck.impact} />
            <DeckLink slimDeck={slimdeck} />
        </li>
    );
}

export function listItemSlimDeckStarless(slimdeck: SlimDeck, i: number) {
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <DeckLink slimDeck={slimdeck} />
        </li>
    );
}

export function listItemArticle(slimdeck: SlimDeck, i: number) {
    let article: DeckArticle = slimdeck as DeckArticle;
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    const hasDesc =
        article.shortDescription && article.shortDescription.length > 0;

    return (
        <li class={klass}>
            <StarRatingWithinListing rating={article.impact} />
            <DeckLink slimDeck={article} />
            {hasDesc && (
                <span class="descriptive-scribble">
                    {article.shortDescription}
                </span>
            )}
        </li>
    );
}
