import { h } from "preact";
import { Ref as PreactRef, useEffect, useRef, useState } from "preact/hooks";

import {
    CivilMode,
    FatDeck,
    FlashCard,
    Font,
    Key,
    Note,
    Notes,
    Reference,
    RefsModified,
    Role,
} from "types";

import { AppStateChange, getAppState } from "app-state";
import { addToolbarSelectableClasses } from "shared/css";

import buildMarkup from "components/build-markup";
import CivilButton from "components/civil-button";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";
import CivilSelect from "components/civil-select";
import CivilTextArea from "components/civil-text-area";
import DeleteConfirmation from "components/delete-confirmation";
import FlashCardIndicator from "components/flashcard-indicator";
import FlashCardCreator from "components/flashcard-creator";
import FontSelector from "components/font-selector";
import ImageSelector from "components/image-selector";
import NoteForm from "components/note-form";
import useLocalReducer from "components/use-local-reducer";
import useMouseHovering from "components/use-mouse-hovering";
import ViewFlashCard from "components/view-flashcard";
import ViewReference from "components/view-reference";
import ViewRole from "components/view-role";

enum ActionType {
    AddDeckReferencesUiShow,
    AddDecksCommit,
    AddNoteAboveUiShow,
    DeletedNote,
    EditedFont,
    EditedNote,
    EditingCancelled,
    FlashCardCreatorShow,
    FlashcardDeleted,
    HideAddDecksUi,
    ImagePasted,
    NoteChanged,
    NoteSetProperty,
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
    changes: RefsModified;
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
        case ActionType.FlashcardDeleted: {
            let flashcard = action.data as FlashCard;
            let res = {
                ...state,
            };

            res.note.flashcards = res.note.flashcards.filter(
                (fc) => fc.id !== flashcard.id
            );
            return res;
        }
        case ActionType.NoteSetProperty: {
            const newNote = { ...state.note };
            newNote[action.data.name] = action.data.value;
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

type Props = {
    note: Note;
    nextNote?: Note; // used for the 'copy below' functionality of refs
    parentDeck: FatDeck;
    onDelete: (id: Key) => void;
    onEdited: (id: Key, n: Note) => void;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
    onUpdateDeck: (d: FatDeck) => void;
    onCopyRefBelow: (r: Reference, nextNote: Note) => void;
    noDelete?: boolean;
};

export default function ViewNote({
    note,
    nextNote,
    parentDeck,
    onDelete,
    onEdited,
    onRefsChanged,
    onUpdateDeck,
    onCopyRefBelow,
    noDelete,
}: Props) {
    const appState = getAppState();

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
        initialState
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
        localDispatch(ActionType.NoteSetProperty, {
            name: "content",
            value: content,
        });
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
        function onSave(changes: RefsModified, refsInNote: Array<Reference>) {
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
            <div class="block-width form-margin">
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

    function flashCardDeleted(flashcard: FlashCard) {
        localDispatch(ActionType.FlashcardDeleted, flashcard);
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

    const [showFlashCard, setShowFlashCard] = useState(
        note.flashcards.map(() => false)
    );

    function onFlashcardClicked(index: number) {
        let newshowFlashCard = [...showFlashCard];
        newshowFlashCard[index] = !newshowFlashCard[index];
        setShowFlashCard(newshowFlashCard);
    }

    return (
        <CivContainer extraClasses={noteClasses}>
            {appState.mode.value === CivilMode.AddAbove &&
                local.addNoteAboveUI &&
                buildAddNoteAboveUI()}
            {!local.isEditingMarkup &&
                buildLeftMarginContent(
                    local.note,
                    onFlashcardClicked,
                    onCopyRefBelow,
                    nextNote
                )}

            {local.isEditingMarkup && buildEditableContent()}

            {note.flashcards
                .filter((_f, i) => {
                    return showFlashCard[i];
                })
                .map((flashcard) => (
                    <ViewFlashCard
                        flashcard={flashcard}
                        onDelete={flashCardDeleted}
                    />
                ))}

            {!local.isEditingMarkup && (
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
                                local.note.id
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
            {local.isEditingMarkup && buildMainButtons()}
        </CivContainer>
    );
}

function buildLeftMarginContent(
    note: Note,
    onFlashcardClicked: (index: number) => void,
    onCopyRefBelow: (ref: Reference, nextNote: Note) => void,
    nextNote?: Note
) {
    function onClickedFlashcard(_f: FlashCard, index: number) {
        onFlashcardClicked(index);
    }

    if (
        note.refs.length > 0 ||
        note.flashcards.length > 0 ||
        note.chatMessage
    ) {
        return (
            <CivLeft>
                {note.chatMessage && <ViewRole role={note.chatMessage!.role} />}
                {note.flashcards.map((flashcard, i) => {
                    return (
                        <FlashCardIndicator
                            flashcard={flashcard}
                            index={i}
                            onClick={onClickedFlashcard}
                        />
                    );
                })}
                {note.refs.length > 0 && note.flashcards.length > 0 && (
                    <div class="spacer"></div>
                )}
                {buildNoteReferences(note.refs, onCopyRefBelow, nextNote)}
            </CivLeft>
        );
    } else {
        return <span></span>;
    }
}

function buildNoteReferences(
    refs: Array<Reference>,
    onCopyRefBelow: (ref: Reference, nextNote: Note) => void,
    nextNote?: Note
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
