import { NoteKind } from "../enums";

import type { FatDeck, Note, Notes, Point, Reference } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { CivContainer, CivLeft } from "./civil-layout";
import NoteForm from "./note-form";
import { svgEdit } from "./svg-icons";
import ViewNote from "./view-note";
import WhenEditMode from "./when-edit-mode";

type ViewPassageChunkyBoyProps<T extends FatDeck> = {
    deck: T;
    onUpdateDeck: (d: T) => void;
    notes: Notes;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
    optionalPoint?: Point;
    appendLabel: string;
    noteKind: NoteKind;
    noAppend?: boolean;
    noDelete?: boolean;
    extraClasses?: string;
};

const ViewPassageChunkyBoy = <T extends FatDeck>({
    deck,
    onUpdateDeck,
    notes,
    onRefsChanged,
    optionalPoint,
    appendLabel,
    noteKind,
    noAppend,
    noDelete,
    extraClasses,
}: ViewPassageChunkyBoyProps<T>) => {
    const appState = getAppState();

    function buildNoteComponent(note: Note, nextNote?: Note) {
        return (
            <ViewNote
                key={note.id}
                note={note}
                nextNote={nextNote}
                parentDeck={deck}
                onRefsChanged={onRefsChanged}
                onUpdateDeck={onUpdateDeck}
                noDelete={noDelete}
            />
        );
    }

    function buildNoteForm() {
        function onCancelled(e: Event) {
            AppStateChange.hideNoteForm({ noteKind });
            e.preventDefault();
        }

        function onNoteCreated(allNotes: Array<Note>) {
            onUpdateDeck({ ...deck, notes: allNotes });
            AppStateChange.hideNoteForm({ noteKind });
        }

        let nextNoteId = undefined;
        let prevNoteId =
            notes && notes.length > 0 ? notes[notes.length - 1]!.id : undefined;
        let optionalPointId = optionalPoint && optionalPoint.id;
        return (
            <NoteForm
                label={appendLabel}
                onCreate={onNoteCreated}
                onCancel={onCancelled}
                deckId={deck.id}
                font={deck.font}
                prevNoteId={prevNoteId}
                nextNoteId={nextNoteId}
                noteKind={noteKind}
                optionalPointId={optionalPointId}
            />
        );
    }

    function buildNoteFormIcon() {
        function onAddNoteClicked(e: Event) {
            if (optionalPoint) {
                AppStateChange.showNoteForm({
                    noteKind,
                    pointId: optionalPoint.id,
                });
            } else {
                AppStateChange.showNoteForm({ noteKind });
            }

            e.preventDefault();
        }

        if (optionalPoint) {
            return (
                <WhenEditMode>
                    <div class="inline-append-note">
                        <div class="left-margin-inline">
                            <div
                                class="fadeable clickable"
                                onClick={onAddNoteClicked}
                            >
                                {svgEdit()}
                                <span class="left-margin-icon-label ui-bold">
                                    {appendLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </WhenEditMode>
            );
        } else {
            return (
                <WhenEditMode>
                    <CivLeft ui>
                        <div
                            class="fadeable clickable"
                            onClick={onAddNoteClicked}
                        >
                            <span class="left-margin-icon-label ui-bold">
                                {appendLabel}
                            </span>
                            {svgEdit()}
                        </div>
                    </CivLeft>
                </WhenEditMode>
            );
        }
    }

    let noteComponents: Array<any> = [];
    notes.forEach((n, i) => {
        if (i < notes.length - 1) {
            noteComponents.push(buildNoteComponent(n, notes[i + 1]));
        } else {
            noteComponents.push(buildNoteComponent(n));
        }
    });

    // const noteComponents = notes ? notes.map(buildNoteComponent) : [];
    let addNoteUI = <div></div>;

    function correctNoteKind() {
        return appState.showNoteForm.value[noteKind];
    }

    function correctPointScope() {
        let showNoteFormPointId = appState.showNoteFormPointId.value;
        return (
            (optionalPoint && showNoteFormPointId === optionalPoint.id) ||
            (!optionalPoint && !showNoteFormPointId)
        );
    }

    if (!noAppend) {
        // checks to make sure the correct NoteForm is displayed
        if (correctNoteKind() && correctPointScope()) {
            addNoteUI = buildNoteForm();
        } else {
            addNoteUI = buildNoteFormIcon();
        }
    }

    let klass = "c-passage ";
    klass += extraClasses ? extraClasses : "";

    return (
        <section class={klass}>
            {noteComponents}
            <CivContainer>{addNoteUI}</CivContainer>
        </section>
    );
};

export default ViewPassageChunkyBoy;
