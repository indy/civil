import { h, ComponentChildren } from "preact";
import { route } from "preact-router";

import { DeckKind } from "types";

import { deckKindToResourceString, deckKindToHeadingString } from "shared/deck";
import { CivContainer, CivMain } from "components/civil-layout";

type Props = {
    deckKind: DeckKind;
    buttons?: ComponentChildren;
    children: ComponentChildren;
};

export default function ModuleDeckKind({ deckKind, children, buttons }: Props) {
    function onClickedHeading() {
        route(`/${deckKindToResourceString(deckKind)}`);
    }

    let klass = "ui clickable ";
    klass += `pigment-fg-${deckKindToResourceString(deckKind)}`;

    return (
        <article class="module">
            <CivContainer>
                <CivMain>
                    <span class="module-top-part">
                        <span class="button-row">{buttons}</span>
                        <h1 class={klass} onClick={onClickedHeading}>
                            {deckKindToHeadingString(deckKind)}
                        </h1>
                    </span>
                    {children}
                </CivMain>
            </CivContainer>
        </article>
    );
}
