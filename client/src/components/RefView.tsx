import { h } from "preact";
import { useState } from "preact/hooks";

import { Ref, RefKind } from "../types";

import { deckKindToResourceString } from "../CivilUtils";

import DeckLink from "./DeckLink";

type Props = {
    deckReference: Ref;
    extraClasses: string;
};

function refKindToString(refKind: RefKind): string {
    switch (refKind) {
        case RefKind.Ref: return "Ref";
        case RefKind.RefToParent: return "RefToParent";
        case RefKind.RefToChild: return "RefToChild";
        case RefKind.RefInContrast: return "RefInContrast";
        case RefKind.RefCritical: return "RefCritical";
    }
}

export default function RefView({ deckReference, extraClasses }: Props) {
    const [expanded, setExpanded] = useState(true);

    if (deckReference) {
        const { id, resource, refKind, name, annotation, insignia } =
            deckReference;

        const str = deckKindToResourceString(resource);
        const href = `/${str}/${id}`;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation() {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        return (
            <div class={extraClasses} key={id}>
                <span class="ref-kind" onClick={clickedToggleAnnotation}>
                    ({refKindToString(refKind)}){!expanded && "+"}
                </span>

                <DeckLink
                    extraClasses="ref"
                    resource={resource}
                    href={href}
                    insignia={insignia}
                    name={name}
                />

                {annotation && expanded && (
                    <div class="ref-scribble pigment-fg-{ str }">
                        {annotation}
                    </div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
