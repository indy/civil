import { h } from "preact";
import { useState } from "preact/hooks";

import { Note, Reference, RefKind, ToolbarMode } from "types";

import { getAppState } from "app-state";

import { deckKindToResourceString } from "utils/civil";

import DeckLink from "components/deck-link";

type Props = {
    reference: Reference;
    extraClasses: string;
    nextNote?: Note;
    onCopyRefBelow?: (r: Reference, nextNote: Note) => void;
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

export default function RefView({
    reference,
    extraClasses,
    nextNote,
    onCopyRefBelow,
}: Props) {
    const appState = getAppState();

    const [expanded, setExpanded] = useState(true);

    if (reference) {
        const { id, deckKind, refKind, annotation } = reference;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation() {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        function clickedCopyRefBelow() {
            if (onCopyRefBelow && nextNote) {
                onCopyRefBelow(reference, nextNote);
            }
        }

        let showCopyBelow = appState.toolbarMode.value === ToolbarMode.Refs;
        if (showCopyBelow) {
            // in the right toolbar mode, now determine if we actually have to show the "copy below" UI
            if (nextNote) {
                // check in case the next note already includes this ref
                const found = nextNote.refs.find((r) => r.id === id);
                if (found) {
                    showCopyBelow = false;
                }
            } else {
                showCopyBelow = false;
            }
        }

        const scribbleClasses = `ref-scribble pigment-fg-${deckKindToResourceString(
            deckKind
        )}`;

        return (
            <div class={extraClasses} key={id}>
                {showCopyBelow && (
                    <span onClick={clickedCopyRefBelow}>&#8595;</span>
                )}

                <span class="ref-kind" onClick={clickedToggleAnnotation}>
                    ({refKindToString(refKind)}){!expanded && "+"}
                </span>

                <DeckLink extraClasses="ref" slimDeck={reference} />

                {annotation && expanded && (
                    <div class={scribbleClasses}>{annotation}</div>
                )}
            </div>
        );
    } else {
        return <div></div>;
    }
}
