import { type Ref as PreactRef, useEffect, useRef } from "preact/hooks";

import { CivilMode, Font, Role } from "../enums";
import type {
    FatDeck,
    FlashCard,
    Key,
    Note,
    Notes,
    Reference,
    ReferencesDiff,
    ReferencesApplied,
} from "../types";

import { AppStateChange, getAppState } from "../app-state";
import { addToolbarSelectableClasses } from "../shared/css";
import Net from "../shared/net";

import buildMarkup from "./build-markup";
import CivilButton from "./civil-button";
import { CivContainer, CivLeft, CivMain } from "./civil-layout";
import CivilSelect from "./civil-select";
import CivilTextArea from "./civil-text-area";
import DeleteConfirmation from "./delete-confirmation";
import FlashCardCreator from "./flashcard-creator";
import FontSelector from "./font-selector";
import ImageSelector from "./image-selector";
import NoteForm from "./note-form";
import useLocalReducer from "./use-local-reducer";
import useMouseHovering from "./use-mouse-hovering";
import ViewReference from "./view-reference";
import ViewRole from "./view-role";
import useFlashcards from "./use-flashcards";

enum ActionType {
    AddDeckReferencesUiShow,
    AddDecksCommit,
    AddNoteAboveUiShow,
    DeletedNote,
    EditedFont,
    EditedNote,
    EditingCancelled,
    FlashCardCreatorShow,
    HideAddDecksUi,
    ImagePasted,
    NoteChanged,
    NoteSetContent,
    TextAreaBlurred,
    TextAreaFocused,
    ToggleEditing,
    ToggleMinimisedText,
}

type LocalState = {
    addDeckReferencesUI: boolean;
    showFlashCardCreator: boolean;
    addNoteAboveUI: boolean;
    isEditingMarkup: boolean;
    note: Note;
    originalContent: string;
    oldCursorPos: number;
    textAreaFocused: boolean;
    canMinimiseText: boolean;
    isMinimisedText: boolean;
};

type ActionDataImagePasted = {
    textAreaRef: PreactRef<HTMLTextAreaElement>;
    markup: string;
};

type ActionDataDecksCommit = {
    refsInNote: Array<Reference>;
    changes: ReferencesDiff;
};

type Action = {
    type: ActionType;
    data?:
        | Note
        | FlashCard
        | number
        | boolean
        | ActionDataImagePasted
        | ActionDataDecksCommit
        | any;
};

function reducer(state: LocalState, action: Action): LocalState {
    switch (action.type) {
        case ActionType.NoteChanged: {
            const note = action.data as Note;
            let newState: LocalState = {
                ...state,
                note,
            };
            return newState;
        }
        case ActionType.ImagePasted: {
            const { textAreaRef, markup } =
                action.data as ActionDataImagePasted;
            const content = state.note.content;

            let cursor: number;
            if (state.textAreaFocused && textAreaRef.current) {
                cursor = textAreaRef.current.selectionStart;
            } else {
                cursor = state.oldCursorPos;
            }

            const newContent =
                content.slice(0, cursor) + markup + " " + content.slice(cursor);

            const res = {
                ...state,
                note: {
                    ...state.note,
                    content: newContent,
                },
                oldCursorPos: cursor + markup.length + 1,
            };
            return res;
        }
        case ActionType.TextAreaFocused: {
            let res = {
                ...state,
                textAreaFocused: true,
            };
            return res;
        }
        case ActionType.TextAreaBlurred: {
            let res = {
                ...state,
                oldCursorPos: action.data as number,
                textAreaFocused: false,
            };
            return res;
        }
        case ActionType.NoteSetContent: {
            const newNote = {
                ...state.note,
                content: action.data,
            };
            return {
                ...state,
                note: newNote,
            };
        }
        case ActionType.AddDeckReferencesUiShow:
            return {
                ...state,
                addDeckReferencesUI: action.data as boolean,
            };
        case ActionType.FlashCardCreatorShow: {
            const showUI = action.data as boolean;
            const newState: LocalState = {
                ...state,
                showFlashCardCreator: showUI,
            };

            return newState;
        }
        case ActionType.AddNoteAboveUiShow: {
            const showUI = action.data as boolean;
            const newState: LocalState = {
                ...state,
                addNoteAboveUI: showUI,
            };

            if (showUI) {
                AppStateChange.obtainKeyboard();
            } else {
                AppStateChange.mode({ mode: CivilMode.View });
                AppStateChange.relinquishKeyboard();
            }

            return newState;
        }
        case ActionType.HideAddDecksUi: {
            const newState: LocalState = {
                ...state,
                addDeckReferencesUI: false,
            };

            return newState;
        }
        case ActionType.AddDecksCommit: {
            const { refsInNote, changes } =
                action.data as ActionDataDecksCommit;

            AppStateChange.noteRefsModified({ refsInNote, changes });

            return {
                ...state,
                addDeckReferencesUI: false,
            };
        }
        case ActionType.ToggleMinimisedText: {
            const newState: LocalState = {
                ...state,
                isMinimisedText: !state.isMinimisedText,
            };

            return newState;
        }
        case ActionType.ToggleEditing: {
            const newState: LocalState = {
                ...state,
                isEditingMarkup: !state.isEditingMarkup,
            };

            if (newState.isEditingMarkup) {
                AppStateChange.obtainKeyboard();
            } else {
                AppStateChange.relinquishKeyboard();
            }

            return newState;
        }
        case ActionType.DeletedNote: {
            AppStateChange.relinquishKeyboard();
            return state;
        }
        case ActionType.EditedNote: {
            const newState: LocalState = {
                ...state,
                isEditingMarkup: false,
                originalContent: state.note.content,
            };

            AppStateChange.relinquishKeyboard();

            return newState;
        }
        case ActionType.EditedFont: {
            const font = action.data as Font;

            const newState: LocalState = {
                ...state,
                isEditingMarkup: false,
            };
            newState.note.font = font;

            AppStateChange.relinquishKeyboard();

            return newState;
        }
        case ActionType.EditingCancelled: {
            const newState: LocalState = {
                ...state,
                isEditingMarkup: false,
                note: {
                    ...state.note,
                    content: state.originalContent,
                },
            };

            AppStateChange.relinquishKeyboard();

            return newState;
        }
    }
}

type Props<T extends FatDeck> = {
    note: Note;
    nextNote?: Note; // used for the 'copy below' functionality of refs
    parentDeck: T;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
    onUpdateDeck: (d: T) => void;
    noDelete?: boolean;
};

const ViewNote = <T extends FatDeck>({
    note,
    nextNote,
    parentDeck,
    onRefsChanged,
    onUpdateDeck,
    noDelete,
}: Props<T>) => {
    const appState = getAppState();


    function onEdited(id: Key, updatedNote: Note) {
        // note: currently this will only update the content and the font
        //
        Net.put<Note, Note>("/api/notes/" + id.toString(), updatedNote).then(newNote => {
            let newDeck: T = {...parentDeck};
            let index = newDeck.notes.findIndex(n => n.id === id);
            if (index !== -1) {
                newDeck.notes[index] = newNote;
            }
            onUpdateDeck(newDeck);
        });
    }

    function onDelete(id: Key) {
        type Data = {};
        let empty: Data = {};
        Net.delete<Data, Notes>("/api/notes/" + id.toString(), empty).then(
            (allRemainingNotes) => {
                let notes = allRemainingNotes;
                onUpdateDeck({ ...parentDeck, notes });
            },
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
                createdAt: ref.createdAt,
                graphTerminator: ref.graphTerminator,
                insignia: ref.insignia,
                font: ref.font,
                impact: ref.impact,
                noteId: note.id,
                refKind: ref.refKind,
            };
            let changeData: ReferencesDiff = {
                referencesChanged: [],
                referencesRemoved: [],
                referencesAdded: [addedRef],
                referencesCreated: [],
            };

            Net.put<ReferencesDiff, ReferencesApplied>(
                `/api/notes/${note.id}/references`,
                changeData,
            ).then((response) => {
                onRefsChanged(note, response.refs);
            });
        }
    }

    const initialState: LocalState = {
        addDeckReferencesUI: false,
        showFlashCardCreator: false,
        addNoteAboveUI: false,
        isEditingMarkup: false,
        note: { ...note },
        originalContent: note.content,
        oldCursorPos: 0,
        textAreaFocused: false,
        canMinimiseText:
            !!note.chatMessage && note.chatMessage.role === Role.System,
        isMinimisedText:
            !!note.chatMessage && note.chatMessage.role === Role.System,
    };
    const [local, localDispatch] = useLocalReducer<LocalState, ActionType>(
        reducer,
        initialState,
    );

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // pick up changes to the note's references
        // from the DeckManager::onRefsChanged callback
        localDispatch(ActionType.NoteChanged, note);
    }, [note]);

    function handleChangeEvent(content: string) {
        localDispatch(ActionType.NoteSetContent, content);
    }

    function onCancelClicked() {
        localDispatch(ActionType.EditingCancelled);
    }

    function onSaveEditsClicked() {
        if (hasNoteBeenModified(local)) {
            const id = note.id;

            if (local.note.content.length === 0) {
                local.note.content =
                    ":side(placeholder content so that note remains selectable)EMPTY";
            }

            // send updated content to server
            //
            const updatedNote: Note = {
                id: local.note.id,
                prevNoteId: null,
                kind: local.note.kind,
                content: local.note.content,
                font: local.note.font,
                pointId: null,
                refs: [],
                flashcards: [],
            };

            // stopped editing and the editable content is different than
            // the original note's text.
            onEdited(id, updatedNote);
            localDispatch(ActionType.EditedNote);
        } else {
            localDispatch(ActionType.ToggleEditing);
        }
    }

    function onTextAreaFocus() {
        localDispatch(ActionType.TextAreaFocused);
    }

    function onTextAreaBlur() {
        if (textAreaRef.current) {
            let tar: HTMLTextAreaElement = textAreaRef.current;
            let cursor = tar.selectionStart;
            localDispatch(ActionType.TextAreaBlurred, cursor);
        }
    }

    function buildEditableContent() {
        return (
            <CivMain>
                <div class="civil-form">
                    <CivilTextArea
                        id="content"
                        elementClass="note-editable-content"
                        value={local.note.content}
                        elementRef={textAreaRef}
                        onFocus={onTextAreaFocus}
                        onBlur={onTextAreaBlur}
                        onContentChange={handleChangeEvent}
                        onPaste={onImagePaste}
                    />
                </div>
            </CivMain>
        );
    }

    function buildAddNoteAboveUI() {
        function onCancelled(e: Event) {
            e.preventDefault();
            localDispatch(ActionType.AddNoteAboveUiShow, false);
        }

        function onNoteCreated(allNotes: Notes) {
            localDispatch(ActionType.AddNoteAboveUiShow, false);
            onUpdateDeck({ ...parentDeck, notes: allNotes });
        }

        return (
            <NoteForm
                label="Insert Note:"
                onCreate={onNoteCreated}
                onCancel={onCancelled}
                deckId={parentDeck.id}
                font={parentDeck.font}
                nextNoteId={note.id}
                noteKind={note.kind}
                optionalPointId={note.pointId ? note.pointId : undefined}
            />
        );
    }

    function buildAddDecksUI() {
        function onSave(changes: ReferencesDiff, refsInNote: Array<Reference>) {
            onRefsChanged(local.note, refsInNote);
            localDispatch(ActionType.AddDecksCommit, {
                refsInNote,
                changes,
            });
        }

        function onCancel() {
            // cancel was pressed
            localDispatch(ActionType.HideAddDecksUi);
        }

        return (
            <CivilSelect
                extraClasses="form-margin"
                parentDeckId={parentDeck.id}
                noteId={note.id}
                chosen={note.refs}
                onSave={onSave}
                onCancel={onCancel}
            />
        );
    }

    // update the markup when clicking on an image in the ImageSelector
    function onImagePaste(markup: string) {
        localDispatch(ActionType.ImagePasted, { textAreaRef, markup });
    }

    function buildMainButtons() {
        function confirmedDeleteClicked() {
            localDispatch(ActionType.DeletedNote);
            onDelete(note.id);
        }

        function onChangedFont(font: Font) {
            const sendingNote: Note = {
                ...note,
                font,
            };
            onEdited(sendingNote.id, sendingNote);
            localDispatch(ActionType.EditedFont, font);
        }

        return (
            <div class="form-margin">
                <CivilButton onClick={onCancelClicked}>Cancel</CivilButton>
                <CivilButton
                    disabled={!hasNoteBeenModified(local)}
                    onClick={onSaveEditsClicked}
                >
                    Save Edits
                </CivilButton>
                {!noDelete && (
                    <DeleteConfirmation onDelete={confirmedDeleteClicked} />
                )}
                <ImageSelector onPaste={onImagePaste} />
                <span class="ui">Font:</span>{" "}
                <FontSelector font={note.font} onChangedFont={onChangedFont} />
            </div>
        );
    }

    let noteClasses = "note";
    if (mouseHovering && appState.mode.value !== CivilMode.View) {
        noteClasses += addToolbarSelectableClasses(appState.mode.value);
    }

    function onNoteClicked() {
        if (appState.mode.value === CivilMode.View && local.canMinimiseText) {
            localDispatch(ActionType.ToggleMinimisedText);
        }

        switch (appState.mode.value) {
            case CivilMode.Edit:
                if (!local.isEditingMarkup) {
                    localDispatch(ActionType.ToggleEditing);
                }
                break;
            case CivilMode.Refs:
                if (!local.addDeckReferencesUI) {
                    localDispatch(ActionType.AddDeckReferencesUiShow, true);
                }
                break;
            case CivilMode.Memorise:
                if (!local.showFlashCardCreator) {
                    localDispatch(ActionType.FlashCardCreatorShow, true);
                }
                break;
            case CivilMode.AddAbove:
                if (!local.addNoteAboveUI) {
                    localDispatch(ActionType.AddNoteAboveUiShow, true);
                }
                break;
        }
    }

    function hideFlashCardCreator() {
        localDispatch(ActionType.FlashCardCreatorShow, false);
    }

    const [flashcardIndicators, maximisedFlashcards] = useFlashcards(
        note.flashcards,
    );

    function isEditingMarkup(): boolean {
        return appState.mode.value === CivilMode.Edit && local.isEditingMarkup;
    }

    return (
        <CivContainer extraClasses={noteClasses}>
            {appState.mode.value === CivilMode.AddAbove &&
                local.addNoteAboveUI &&
                buildAddNoteAboveUI()}
            {!isEditingMarkup() &&
                (note.refs.length > 0 ||
                    note.flashcards.length > 0 ||
                    note.chatMessage) && (
                    <CivLeft>
                        {note.chatMessage && (
                            <ViewRole role={note.chatMessage!.role} />
                        )}
                        {flashcardIndicators}
                        {note.refs.length > 0 && note.flashcards.length > 0 && (
                            <div class="spacer"></div>
                        )}
                        {buildNoteReferences(
                            note.refs,
                            onCopyRefBelow,
                            nextNote,
                        )}
                    </CivLeft>
                )}
            {isEditingMarkup() && buildEditableContent()}
            {maximisedFlashcards}
            {!isEditingMarkup() && (
                <CivMain>
                    <div onClick={onNoteClicked} ref={hoveringRef}>
                        {local.isMinimisedText && (
                            <p class="typeface-serif minimised-text">
                                minimised, click to expand&hellip;
                            </p>
                        )}
                        {!local.isMinimisedText &&
                            buildMarkup(
                                local.note.content,
                                local.note.font,
                                local.note.id,
                            )}
                    </div>
                </CivMain>
            )}

            {appState.mode.value === CivilMode.Refs &&
                local.addDeckReferencesUI &&
                buildAddDecksUI()}
            {appState.mode.value === CivilMode.Memorise &&
                local.showFlashCardCreator && (
                    <FlashCardCreator
                        note={local.note}
                        onHide={hideFlashCardCreator}
                    />
                )}
            {isEditingMarkup() && buildMainButtons()}
        </CivContainer>
    );
};

export default ViewNote;

function buildNoteReferences(
    refs: Array<Reference>,
    onCopyRefBelow: (ref: Reference, nextNote: Note) => void,
    nextNote?: Note,
) {
    const entries = refs.map((ref) => {
        return (
            <ViewReference
                reference={ref}
                extraClasses="left-margin-entry"
                nextNote={nextNote}
                onCopyRefBelow={onCopyRefBelow}
            />
        );
    });

    return entries;
}

function hasNoteBeenModified(local: LocalState) {
    return local.note.content !== local.originalContent;
}
