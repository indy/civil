import { h } from "preact";

import {
    ProtoNoteReferences,
    ReferencesApplied,
    DeckPoint,
    FatDeck,
    Key,
    Note,
    NoteKind,
    Notes,
    Reference,
    CivilMode,
} from "types";

import Net from "shared/net";
import { getAppState, AppStateChange } from "app-state";
import { svgEdit } from "components/svg-icons";

import { CivContainer, CivLeft } from "components/civil-layout";
import NoteForm from "components/note-form";
import NoteView from "components/note-view";
import WhenEditMode from "components/when-edit-mode";

type PassageProps = {
    deck: FatDeck;
    mode: CivilMode;
    onUpdateDeck: (d: FatDeck) => void;
    notes: Notes;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
    optionalDeckPoint?: DeckPoint;
    appendLabel: string;
    noteKind: NoteKind;
    noAppend?: boolean;
    noDelete?: boolean;
};

export default function Passage({
    deck,
    mode,
    onUpdateDeck,
    notes,
    onRefsChanged,
    optionalDeckPoint,
    appendLabel,
    noteKind,
    noAppend,
    noDelete,
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

    // copy the given ref onto the note (if it doesn't already exist)
    function onCopyRefBelow(ref: Reference, note: Note) {
        // check if the note already contains the ref
        const found = note.refs.find((r) => r.id === ref.id);
        if (found) {
            console.log("already has ref");
        } else {
            const addedRef: Reference = {
                id: ref.id,
                title: ref.title,
                deckKind: ref.deckKind,
                insignia: ref.insignia,
                font: ref.font,
                noteId: note.id,
                refKind: ref.refKind,
            };
            let changeData: ProtoNoteReferences = {
                noteId: note.id,
                referencesChanged: [],
                referencesRemoved: [],
                referencesAdded: [addedRef],
                referencesCreated: [],
            };

            Net.post<ProtoNoteReferences, ReferencesApplied>(
                "/api/edges/notes_decks",
                changeData
            ).then((response) => {
                onRefsChanged(note, response.refs);
            });
        }
    }

    function buildNoteComponent(note: Note, nextNote?: Note) {
        return (
            <NoteView
                key={note.id}
                note={note}
                nextNote={nextNote}
                parentDeck={deck}
                mode={mode}
                onDelete={onDeleteNote}
                onEdited={onEditedNote}
                onRefsChanged={onRefsChanged}
                onUpdateDeck={onUpdateDeck}
                onCopyRefBelow={onCopyRefBelow}
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
            notes && notes.length > 0 ? notes[notes.length - 1].id : undefined;
        let optionalPointId = optionalDeckPoint && optionalDeckPoint.id;
        return (
            <NoteForm
                label="Append Note:"
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
            if (optionalDeckPoint) {
                AppStateChange.showNoteForm({
                    noteKind,
                    pointId: optionalDeckPoint.id,
                });
            } else {
                AppStateChange.showNoteForm({ noteKind });
            }

            e.preventDefault();
        }

        if (optionalDeckPoint) {
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
                    <CivContainer extraClasses="append-note">
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
                    </CivContainer>
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

    function correctDeckPointScope() {
        let showNoteFormPointId = appState.showNoteFormPointId.value;
        return (
            (optionalDeckPoint &&
                showNoteFormPointId === optionalDeckPoint.id) ||
            (!optionalDeckPoint && !showNoteFormPointId)
        );
    }

    if (!noAppend) {
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
