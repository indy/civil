import { h } from "preact";
import { useState } from "preact/hooks";

import DeckLink from "./DeckLink";

export default function Ref({
    deckReference,
    extraClasses,
}: {
    deckReference: any;
    extraClasses: string;
}) {
    const [expanded, setExpanded] = useState(true);

    if (deckReference) {
        const { id, resource, refKind, name, annotation, insignia } =
            deckReference;
        const href = `/${resource}/${id}`;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation() {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        return (
            <div class={extraClasses} key={id}>
                <span class="ref-kind" onClick={clickedToggleAnnotation}>
                    ({refKind}){!expanded && "+"}
                </span>

                <DeckLink
                    extraClasses="ref"
                    resource={resource}
                    href={href}
                    insignia={insignia}
                    name={name}
                />

                {annotation && expanded && (
                    <div class="ref-scribble pigment-fg-{ resource }">
                        {annotation}
                    </div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
