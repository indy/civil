import { NoteKind } from "../enums";

import type { FatDeck, Note, Notes, Point, Reference } from "../types";

import { CivilMode } from "../enums";

import { AppStateChange, getAppState } from "../app-state";

import { CivContainer } from "./civil-layout";
import CivilModeButton from "./civil-mode-button";
import NoteForm from "./note-form";
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
        function onCancelled() {
            AppStateChange.hideNoteForm({ noteKind });
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
        function onAddNoteClicked() {
            if (optionalPoint) {
                AppStateChange.showNoteForm({
                    noteKind,
                    pointId: optionalPoint.id,
                });
            } else {
                AppStateChange.showNoteForm({ noteKind });
            }
        }

        if (optionalPoint) {
            return (
                <WhenEditMode>
                    <div class="inline-append-note">
                        <div class="left-margin-inline">
                            <CivilModeButton
                                mode={CivilMode.Edit}
                                onClick={onAddNoteClicked}
                            >
                                {appendLabel}
                            </CivilModeButton>
                        </div>
                    </div>
                </WhenEditMode>
            );
        } else {
            return (
                <WhenEditMode>
                    <CivilModeButton
                        mode={CivilMode.Edit}
                        onClick={onAddNoteClicked}
                    >
                        {appendLabel}
                    </CivilModeButton>
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
