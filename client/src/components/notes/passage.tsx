import { h } from "preact";

import {
    DeckPoint,
    FatDeck,
    Key,
    Note,
    NoteKind,
    Notes,
    Ref,
    ToolbarMode,
} from "types";

import Net from "utils/net";
import { getAppState, AppStateChange } from "app-state";
import { svgEdit } from "components/svg-icons";

import { CivLeft } from "components/civil-layout";
import NoteForm from "components/notes/note-form";
import NoteView from "components/notes/note-view";
import WhenVerbose from "components/when-verbose";

type PassageProps = {
    deck: FatDeck;
    toolbarMode: ToolbarMode;
    onUpdateDeck: (d: FatDeck) => void;
    notes: Notes;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    optionalDeckPoint?: DeckPoint;
    appendLabel: string;
    noteKind: NoteKind;
    noappend?: boolean;
};

export default function Passage({
    deck,
    toolbarMode,
    onUpdateDeck,
    notes,
    onRefsChanged,
    optionalDeckPoint,
    appendLabel,
    noteKind,
    noappend,
}: PassageProps) {
    const appState = getAppState();

    function onEditedNote(id: Key, updatedNote: Note) {
        Net.put<Note, Note>("/api/notes/" + id.toString(), updatedNote);
    }

    function onDeleteNote(id: Key) {
        type Data = {};
        let empty: Data = {};
        Net.delete<Data, Notes>("/api/notes/" + id.toString(), empty).then(
            (allRemainingNotes) => {
                let notes = allRemainingNotes;
                onUpdateDeck({ ...deck, notes });
            }
        );
    }

    function buildNoteComponent(note: Note) {
        return (
            <NoteView
                key={note.id}
                note={note}
                parentDeck={deck}
                toolbarMode={toolbarMode}
                onDelete={onDeleteNote}
                onEdited={onEditedNote}
                onRefsChanged={onRefsChanged}
                onUpdateDeck={onUpdateDeck}
            />
        );
    }

    function buildNoteForm() {
        function onCancelled(e: Event) {
            AppStateChange.hideNoteForm(noteKind);
            e.preventDefault();
        }

        function onNoteCreated(allNotes: Array<Note>) {
            onUpdateDeck({ ...deck, notes: allNotes });
            AppStateChange.hideNoteForm(noteKind);
        }

        let nextNoteId = undefined;
        let prevNoteId =
            notes && notes.length > 0 ? notes[notes.length - 1].id : undefined;
        let optionalPointId = optionalDeckPoint && optionalDeckPoint.id;
        return (
            <NoteForm
                label="Append Note:"
                onCreate={onNoteCreated}
                onCancel={onCancelled}
                deckId={deck.id}
                prevNoteId={prevNoteId}
                nextNoteId={nextNoteId}
                noteKind={noteKind}
                optionalPointId={optionalPointId}
            />
        );
    }

    function buildNoteFormIcon() {
        function onAddNoteClicked(e: Event) {
            if (optionalDeckPoint) {
                AppStateChange.showNoteForm(noteKind, optionalDeckPoint.id);
            } else {
                AppStateChange.showNoteForm(noteKind);
            }

            e.preventDefault();
        }

        if (optionalDeckPoint) {
            return (
                <WhenVerbose>
                    <div class="inline-append-note">
                        <div class="left-margin-inline">
                            <div
                                class="left-margin-entry-no-note-on-right fadeable clickable"
                                onClick={onAddNoteClicked}
                            >
                                {svgEdit()}
                                <span class="left-margin-icon-label ui-bold">
                                    {appendLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </WhenVerbose>
            );
        } else {
            return (
                <WhenVerbose>
                    <div class="append-note">
                        <CivLeft>
                            <div
                                class="left-margin-entry-no-note-on-right fadeable clickable"
                                onClick={onAddNoteClicked}
                            >
                                <span class="left-margin-icon-label ui-bold">
                                    {appendLabel}
                                </span>
                                {svgEdit()}
                            </div>
                        </CivLeft>
                    </div>
                </WhenVerbose>
            );
        }
    }

    const noteComponents = notes ? notes.map(buildNoteComponent) : [];
    let addNoteUI = <div></div>;

    function correctNoteKind() {
        return appState.showNoteForm.value[noteKind];
    }

    function correctDeckPointScope() {
        let showNoteFormPointId = appState.showNoteFormPointId.value;
        return (
            (optionalDeckPoint &&
                showNoteFormPointId === optionalDeckPoint.id) ||
            (!optionalDeckPoint && !showNoteFormPointId)
        );
    }

    if (!noappend) {
        // checks to make sure the correct NoteForm is displayed
        if (correctNoteKind() && correctDeckPointScope()) {
            addNoteUI = buildNoteForm();
        } else {
            addNoteUI = buildNoteFormIcon();
        }
    }

    return (
        <section>
            {noteComponents}
            {addNoteUI}
        </section>
    );
}
