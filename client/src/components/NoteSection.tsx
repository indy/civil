import { h } from "preact";

import {
    DeckKind,
    DeckPoint,
    IDeckCore,
    Note,
    NoteKind,
    NoteSectionHowToShow,
    Notes,
    Ref,
    ShowNoteForm,
    ToolbarMode,
} from "../types";

import Net from "../Net";
import { getAppState, AppStateChange } from "../AppState";
import { svgEdit } from "../svgIcons";

import NoteForm from "./NoteForm";
import NoteView from "./NoteView";
import RollableSection from "./RollableSection";
import WhenVerbose from "./WhenVerbose";

type NoteSectionProps = {
    heading: string;
    noteKind: NoteKind;
    notes: Notes;
    howToShow: NoteSectionHowToShow;
    deck: IDeckCore;
    toolbarMode: ToolbarMode;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    deckKind: DeckKind;
    onUpdateDeck: (d: IDeckCore) => void;
    noappend?: boolean;
};

function NoteSection({
    heading,
    noteKind,
    notes,
    howToShow,
    deck,
    toolbarMode,
    onRefsChanged,
    onUpdateDeck,
    noappend,
}: NoteSectionProps) {
    function noteManager(noteKind: NoteKind) {
        let appendLabel = "Append Note";

        if (noteKind === NoteKind.NoteSummary) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NoteKind.NoteReview) {
            appendLabel = "Append Review Note";
        }

        return NoteManager({
            deck,
            toolbarMode,
            onUpdateDeck,
            notes,
            onRefsChanged,
            appendLabel,
            noteKind,
            noappend,
        });
    }

    switch (howToShow) {
        case NoteSectionHowToShow.Hide:
            return <div></div>;
        case NoteSectionHowToShow.Exclusive:
            return noteManager(noteKind);
        case NoteSectionHowToShow.Show:
            return (
                <RollableSection heading={heading}>
                    {noteManager(noteKind)}
                </RollableSection>
            );
    }
}

type NoteManagerProps = {
    deck: IDeckCore;
    toolbarMode: ToolbarMode;
    onUpdateDeck: (d: IDeckCore) => void;
    notes: Notes;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    optionalDeckPoint?: DeckPoint;
    appendLabel: string;
    noteKind: NoteKind;
    noappend?: boolean;
};
function NoteManager({
    deck,
    toolbarMode,
    onUpdateDeck,
    notes,
    onRefsChanged,
    optionalDeckPoint,
    appendLabel,
    noteKind,
    noappend,
}: NoteManagerProps) {
    const appState = getAppState();

    function onEditedNote(id: number, updatedNote: Note) {
        Net.put<Note, any>("/api/notes/" + id.toString(), updatedNote);
    }

    function onDeleteNote(id: number) {
        type Data = {};
        let empty: Data = {};
        Net.delete<Data, Notes>("/api/notes/" + id.toString(), empty).then(
            (allRemainingNotes) => {
                let notes = allRemainingNotes;
                onUpdateDeck({ ...deck, notes });
            }
        );
    }

    function buildNoteComponent(note) {
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
                console.log(
                    `onAddNoteClicked with deckpoint ${optionalDeckPoint.id}`
                );
                AppStateChange.showNoteForm(noteKind, optionalDeckPoint.id);
            } else {
                console.log(`onAddNoteClicked without deckpoint`);
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
                        <div class="left-margin">
                            <div
                                class="left-margin-entry-no-note-on-right fadeable clickable"
                                onClick={onAddNoteClicked}
                            >
                                <span class="left-margin-icon-label ui-bold">
                                    {appendLabel}
                                </span>
                                {svgEdit()}
                            </div>
                        </div>
                    </div>
                </WhenVerbose>
            );
        }
    }

    const noteComponents = notes ? notes.map(buildNoteComponent) : [];
    let addNoteUI = <div></div>;

    function correctNoteKind() {
        let showNoteForm: ShowNoteForm = appState.showNoteForm.value;
        return (
            (noteKind === NoteKind.Note && showNoteForm.note) ||
            (noteKind === NoteKind.NoteReview && showNoteForm.review) ||
            (noteKind === NoteKind.NoteSummary && showNoteForm.summary)
        );
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

export { NoteSection, NoteManager };
