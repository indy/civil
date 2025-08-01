import { useState } from "preact/hooks";

import { CivilMode, RenderingDeckPart } from "../enums";
import type { Note, Reference } from "../types";

import { getAppState } from "../app-state";

import { deckKindToResourceString } from "../shared/deck";
import { fontClass } from "../shared/font";
import { refKindToString } from "../shared/ref-kind";

import DeckLink from "./deck-link";

type Props = {
    reference: Reference;
    extraClasses: string;
    nextNote?: Note;
    onCopyRefBelow?: (r: Reference, nextNote: Note) => void;
};

export default function ViewReference({
    reference,
    extraClasses,
    nextNote,
    onCopyRefBelow,
}: Props) {
    const appState = getAppState();

    const [expanded, setExpanded] = useState(true);

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

    let showCopyBelow = appState.mode.value === CivilMode.Refs;
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

    let klass = fontClass(reference.font, RenderingDeckPart.UiInterleaved);
    klass += " " + extraClasses;

    const scribbleClasses = `ref-scribble pigment-fg-${deckKindToResourceString(
        deckKind,
    )}`;

    return (
        <div class={klass} key={id}>
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
}
