import { h, ComponentChildren } from "preact";

import { DeckKind } from "types";

import { deckKindToHeadingString } from "utils/civil";

import { CivContainer, CivMain } from "components/civil-layout";

type Props = {
    deckKind: DeckKind;
    children: ComponentChildren;
};

export default function DeckListingPage({ deckKind, children }: Props) {
    return (
        <article class="listing-page">
            <CivContainer>
                <CivMain>
                    <h1 class="ui">{deckKindToHeadingString(deckKind)}</h1>
                    {children}
                </CivMain>
            </CivContainer>
        </article>
    );
}
