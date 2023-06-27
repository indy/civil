import { h } from "preact";
import { useState } from "preact/hooks";

import { Reference, RefKind } from "types";

import { deckKindToResourceString } from "utils/civil";

import DeckLink from "components/deck-link";

type Props = {
    deckReference: Reference;
    extraClasses: string;
};

function refKindToString(refKind: RefKind): string {
    switch (refKind) {
        case RefKind.Ref:
            return "Ref";
        case RefKind.RefToParent:
            return "RefToParent";
        case RefKind.RefToChild:
            return "RefToChild";
        case RefKind.RefInContrast:
            return "RefInContrast";
        case RefKind.RefCritical:
            return "RefCritical";
    }
}

export default function RefView({ deckReference, extraClasses }: Props) {
    const [expanded, setExpanded] = useState(true);

    if (deckReference) {
        const { id, deckKind, refKind, annotation } = deckReference;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation() {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        const scribbleClasses = `ref-scribble pigment-fg-${deckKindToResourceString(
            deckKind
        )}`;

        return (
            <div class={extraClasses} key={id}>
                <span class="ref-kind" onClick={clickedToggleAnnotation}>
                    ({refKindToString(refKind)}){!expanded && "+"}
                </span>

                <DeckLink extraClasses="ref" slimDeck={deckReference} />

                {annotation && expanded && (
                    <div class={scribbleClasses}>{annotation}</div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
