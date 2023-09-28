import { DeckArticle, SlimDeck } from "../types";

import { StarRatingWithinListing } from "./star-rating";
import DeckLink from "./deck-link";

export function renderPaginatedSlimDeck(slimdeck: SlimDeck, i: number) {
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <StarRatingWithinListing rating={slimdeck.impact} />
            <DeckLink slimDeck={slimdeck} />
        </li>
    );
}

export function renderPaginatedArticle(slimdeck: SlimDeck, i: number) {
    let article: DeckArticle = slimdeck as DeckArticle;
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <StarRatingWithinListing rating={article.impact} />
            <DeckLink slimDeck={article} />
            <span class="descriptive-scribble">{article.shortDescription}</span>
        </li>
    );
}

export function renderPaginatedPerson(slimdeck: SlimDeck, i: number) {
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <DeckLink slimDeck={slimdeck} />
        </li>
    );
}

export function renderPaginatedEvent(slimdeck: SlimDeck, i: number) {
    let klass = i % 2 ? "stripe-a" : "stripe-b";

    return (
        <li class={klass}>
            <DeckLink slimDeck={slimdeck} />
        </li>
    );
}
