import { h, ComponentChildren } from "preact";

import { DeckKind } from "types";

import { deckKindToHeadingString } from "utils/civil";

type Props = {
    deckKind: DeckKind;
    children: ComponentChildren;
};

export default function DeckListingPage({ deckKind, children }: Props) {
    return (
        <article class="listing-page">
            <h1 class="ui">{deckKindToHeadingString(deckKind)}</h1>
            {children}
        </article>
    );
}
