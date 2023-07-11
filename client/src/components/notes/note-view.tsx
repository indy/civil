import { h } from "preact";
import { useEffect, useState, useRef, Ref as PreactRef } from "preact/hooks";

import {
    FlashCard,
    FatDeck,
    Key,
    Note,
    Notes,
    Reference,
    RefsModified,
    Role,
    State,
    CivilMode,
} from "types";

import Net from "utils/net";
import { addToolbarSelectableClasses } from "utils/civil";
import { getAppState, AppStateChange } from "app-state";
import { svgFlashCard } from "components/svg-icons";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import CivilSelect from "components/civil-select";
import CivilTextArea from "components/civil-text-area";
import DeleteConfirmation from "components/delete-confirmation";
import FlashCardView from "components/flashcard-view";
import ImageSelector from "components/images/image-selector";
import NoteForm from "components/notes/note-form";
import RefView from "components/ref-view";
import RoleView from "components/role-view";
import buildMarkup from "components/notes/build-markup";
import useLocalReducer from "components/use-local-reducer";
import useMouseHovering from "components/use-mouse-hovering";

enum ActionType {
    AddDecksCommit,
    AddDeckReferencesUiShow,
    AddFlashCardUiShow,
    AddNoteAboveUiShow,
    EditedNote,
    EditingCancelled,
    FlashcardDeleted,
    FlashcardHide,
    FlashcardToggle,
    FlashCardSaved,
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
    addFlashCardUI: boolean;
    addNoteAboveUI: boolean;
    isEditingMarkup: boolean;
    note: Note;
    originalContent: string;
    flashcardToShow: FlashCard | undefined;
    oldCursorPos: number;
    textAreaFocused: boolean;
    canMinimiseText: boolean;
    isMinimisedText: boolean;
};

type ActionDataFlashCardSaved = {
    flashcard: FlashCard;
    appState: State;
};

type ActionDataImagePasted = {
    textAreaRef: PreactRef<HTMLTextAreaElement>;
    markup: string;
};

type ActionDataDecksCommit = {
    allDecksForNote: Array<Reference>;
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
        | ActionDataFlashCardSaved
        | any;
};

function reducer(state: LocalState, action: Action): LocalState {
    switch (action.type) {
        case ActionType.NoteChanged: {
            const note = action.data as Note;
            let newState = {
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
        case ActionType.FlashcardHide: {
            let res = { ...state };
            res.flashcardToShow = undefined;
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
            res.flashcardToShow = undefined;

            return res;
        }
        case ActionType.FlashcardToggle: {
            let res = { ...state };
            let fc = action.data as FlashCard;

            if (res.flashcardToShow) {
                if (res.flashcardToShow.id === fc.id) {
                    res.flashcardToShow = undefined;
                } else {
                    res.flashcardToShow = fc;
                }
            } else {
                res.flashcardToShow = fc;
            }

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
        case ActionType.AddFlashCardUiShow: {
            const showUI = action.data as boolean;
            const newState = {
                ...state,
                addFlashCardUI: showUI,
            };

            if (showUI) {
                AppStateChange.obtainKeyboard();
            } else {
                AppStateChange.relinquishKeyboard();
            }

            return newState;
        }
        case ActionType.AddNoteAboveUiShow: {
            const showUI = action.data as boolean;
            const newState = {
                ...state,
                addNoteAboveUI: showUI,
            };

            if (showUI) {
                AppStateChange.obtainKeyboard();
            } else {
                AppStateChange.setCivilModeToView();
                AppStateChange.relinquishKeyboard();
            }

            return newState;
        }
        case ActionType.HideAddDecksUi: {
            const newState = {
                ...state,
                addDeckReferencesUI: false,
            };

            return newState;
        }
        case ActionType.AddDecksCommit: {
            const { allDecksForNote, changes } =
                action.data as ActionDataDecksCommit;

            AppStateChange.noteRefsModified(allDecksForNote, changes);

            return {
                ...state,
                addDeckReferencesUI: false,
            };
        }
        case ActionType.FlashCardSaved: {
            let { flashcard, appState } =
                action.data as ActionDataFlashCardSaved;

            const newState = {
                ...state,
                addFlashCardUI: false,
            };

            if (newState.note.flashcards) {
                newState.note.flashcards.push(flashcard);
            } else {
                newState.note.flashcards = [flashcard];
            }

            let reviewCount = appState.memoriseReviewCount.value + 1;

            AppStateChange.relinquishKeyboard();
            AppStateChange.setCivilModeToView();
            AppStateChange.setReviewCount(reviewCount);

            return newState;
        }
        case ActionType.ToggleMinimisedText: {
            const newState = {
                ...state,
                isMinimisedText: !state.isMinimisedText,
            };

            return newState;
        }
        case ActionType.ToggleEditing: {
            const newState = {
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
        case ActionType.EditedNote: {
            const newState = {
                ...state,
                isEditingMarkup: false,
                originalContent: state.note.content,
            };

            AppStateChange.relinquishKeyboard();

            return newState;
        }
        case ActionType.EditingCancelled: {
            const newState = {
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
    mode: CivilMode;
    onDelete: (id: Key) => void;
    onEdited: (id: Key, n: Note) => void;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
    onUpdateDeck: (d: FatDeck) => void;
    onCopyRefBelow: (r: Reference, nextNote: Note) => void;
    noDelete?: boolean;
};

export default function NoteView({
    note,
    nextNote,
    parentDeck,
    mode,
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
        addFlashCardUI: false,
        addNoteAboveUI: false,
        isEditingMarkup: false,
        note: { ...note },
        originalContent: note.content,
        flashcardToShow: undefined,
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

    function onCancelClicked(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.EditingCancelled);
    }

    function onSaveEditsClicked(e: Event) {
        e.preventDefault();

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
        );
    }

    function buildAddFlashCardUI() {
        let [flashCardPrompt, setFlashCardPrompt] = useState("");

        function onCancel(e: Event) {
            e.preventDefault();
            localDispatch(ActionType.AddFlashCardUiShow, false);
        }

        function onSave(e: Event) {
            e.preventDefault();

            let data = {
                noteId: note.id,
                prompt: flashCardPrompt,
            };

            Net.post("/api/memorise", data).then((newFlashcard) => {
                localDispatch(ActionType.FlashCardSaved, {
                    flashcard: newFlashcard,
                    appState,
                });
                setFlashCardPrompt("");
            });
        }

        function onContentChange(content: string) {
            setFlashCardPrompt(content);
        }

        return (
            <div class="block-width form-margin">
                <label>Flash Card Prompt</label>
                <div>
                    <CivilTextArea
                        value={flashCardPrompt}
                        onContentChange={onContentChange}
                    />
                </div>
                <button onClick={onCancel}>Cancel</button>
                <button onClick={onSave}>Save Flash Card Prompt</button>
            </div>
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
                nextNoteId={note.id}
                noteKind={note.kind}
                optionalPointId={note.pointId ? note.pointId : undefined}
            />
        );
    }

    function buildAddDecksUI() {
        function onSave(
            changes: RefsModified,
            allDecksForNote: Array<Reference>
        ) {
            onRefsChanged(local.note, allDecksForNote);
            localDispatch(ActionType.AddDecksCommit, {
                allDecksForNote,
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
            onDelete(note.id);
        }
        return (
            <div class="block-width form-margin">
                <button onClick={onCancelClicked}>Cancel</button>
                <button
                    disabled={!hasNoteBeenModified(local)}
                    onClick={onSaveEditsClicked}
                >
                    Save Edits
                </button>
                {!noDelete && (
                    <DeleteConfirmation onDelete={confirmedDeleteClicked} />
                )}
                <ImageSelector onPaste={onImagePaste} />
            </div>
        );
    }

    function flashCardDeleted(flashcard: FlashCard) {
        localDispatch(ActionType.FlashcardDeleted, flashcard);
    }

    let noteClasses = "note";
    if (mouseHovering && mode !== CivilMode.View) {
        noteClasses += addToolbarSelectableClasses(mode);
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
                    localDispatch(
                        ActionType.AddDeckReferencesUiShow,
                        !local.addDeckReferencesUI
                    );
                }
                break;
            case CivilMode.Memorise:
                if (!local.addFlashCardUI) {
                    localDispatch(
                        ActionType.AddFlashCardUiShow,
                        !local.addFlashCardUI
                    );
                }
                break;
            case CivilMode.AddAbove:
                if (!local.addNoteAboveUI) {
                    localDispatch(
                        ActionType.AddNoteAboveUiShow,
                        !local.addNoteAboveUI
                    );
                }
                break;
        }
    }

    // console.log("input:");
    // console.log(local.note.content);
    // console.log("output:");
    // console.log(buildSimplifiedText(local.note.content));

    return (
        <CivContainer extraClasses={noteClasses}>
            {appState.mode.value === CivilMode.AddAbove &&
                local.addNoteAboveUI &&
                buildAddNoteAboveUI()}
            {!local.isEditingMarkup &&
                buildLeftMarginContent(
                    local.note,
                    localDispatch,
                    onCopyRefBelow,
                    nextNote
                )}

            {local.isEditingMarkup && buildEditableContent()}
            {local.flashcardToShow && (
                <FlashCardView
                    flashcard={local.flashcardToShow}
                    onDelete={flashCardDeleted}
                />
            )}

            {!local.isEditingMarkup && (
                <CivMain>
                    <div onClick={onNoteClicked} ref={hoveringRef}>
                        {local.isMinimisedText && (
                            <p class="minimised-text">
                                minimised, click to expand&hellip;
                            </p>
                        )}
                        {!local.isMinimisedText &&
                            buildMarkup(local.note.content, local.note.id)}
                    </div>
                </CivMain>
            )}

            {appState.mode.value === CivilMode.Refs &&
                local.addDeckReferencesUI &&
                buildAddDecksUI()}
            {appState.mode.value === CivilMode.Memorise &&
                local.addFlashCardUI &&
                buildAddFlashCardUI()}
            {local.isEditingMarkup && buildMainButtons()}
        </CivContainer>
    );
}

function buildLeftMarginContent(
    note: Note,
    localDispatch: Function,
    onCopyRefBelow: (ref: Reference, nextNote: Note) => void,
    nextNote?: Note
) {
    if (note.refs.length > 0 || note.flashcards.length > 0) {
        return (
            <CivLeft>
                {note.chatMessage && <RoleView role={note.chatMessage!.role} />}
                {buildFlashcardIndicator(note.flashcards, localDispatch)}
                {note.refs && note.flashcards && <div class="spacer"></div>}
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
            <RefView
                reference={ref}
                extraClasses="left-margin-entry"
                nextNote={nextNote}
                onCopyRefBelow={onCopyRefBelow}
            />
        );
    });

    return entries;
}

function buildFlashcardIndicator(
    flashcards: Array<FlashCard>,
    localDispatch: Function
) {
    // a single note may have multiple flashcards
    const entries = flashcards.map((fc) => {
        const { id } = fc;

        function onFlashcardIconClicked(e: Event) {
            e.preventDefault();
            localDispatch(ActionType.FlashcardToggle, fc);
        }

        return (
            <div class="left-margin-entry" key={id}>
                <span class="inlined-blocked" onClick={onFlashcardIconClicked}>
                    {svgFlashCard()}
                </span>
            </div>
        );
    });

    return entries;
}

function hasNoteBeenModified(local: LocalState) {
    return local.note.content !== local.originalContent;
}
