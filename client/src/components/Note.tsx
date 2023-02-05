import { h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";

import { ToolbarMode } from '../types';

import { getAppState, AppStateChange } from '../AppState';

import Net from '../Net';
import { addToolbarSelectableClasses } from '../CivilUtils';
import { svgFlashCard } from '../svgIcons';
import { useLocalReducer } from '../PreactUtils';

import CivilSelect from './CivilSelect';
import CivilTextArea from './CivilTextArea';
import DeleteConfirmation from './DeleteConfirmation';
import FlashCard from './FlashCard';
import ImageSelector from './ImageSelector';
import NoteForm from './NoteForm';
import Ref from './Ref';
import buildMarkup from './BuildMarkup';

const ADD_DECKS_COMMIT = 'add-decks-commit';
const ADD_DECK_REFERENCES_UI_SHOW = 'add-deck-references-ui-show';
const ADD_FLASH_CARD_UI_SHOW = 'add-flashcard-ui-show';
const ADD_NOTE_ABOVE_UI_SHOW = 'add-note-above-ui-show';
const EDITED_NOTE = 'edited-note';
const EDITING_CANCELLED = 'editing-cancelled';
const FLASHCARD_DELETED = 'flashcard-deleted';
const FLASHCARD_HIDE = 'flashcard-hide';
const FLASHCARD_TOGGLE = 'flashcard-toggle';
const FLASH_CARD_SAVED = 'flash-card-saved';
const HIDE_ADD_DECKS_UI = 'hide-add-decks-ui';
const IMAGE_PASTED = 'image-pasted';
const MOUSE_ENTER = "mouse-enter";
const MOUSE_LEAVE = "mouse-leave";
const NOTE_CHANGED = 'note-changed';
const NOTE_SET_PROPERTY = 'note-set-property';
const TEXT_AREA_BLURRED = 'text-area-blurred';
const TEXT_AREA_FOCUSED = 'text-area-focused';
const TOGGLE_EDITING = 'toggle-editing';

function reducer(state?: any, action?: any) {
    switch(action.type) {
    case NOTE_CHANGED: {
        const note = action.data;
        let newState = {
            ...state,
            note
        };
        return newState;
    }
    case IMAGE_PASTED: {
        const { textAreaRef, markup } = action.data;
        const content = state.note.content;

        let cursor;
        if (state.textAreaFocused) {
            cursor = textAreaRef.current.selectionStart;
        } else {
            cursor = state.oldCursorPos;
        }

        const newContent = content.slice(0, cursor) + markup + " " + content.slice(cursor);

        const res = {
            ...state,
            note: {
                ...state.note,
                content: newContent
            },
            oldCursorPos: cursor + markup.length + 1
        };
        return res;
    }
    case TEXT_AREA_FOCUSED: {
        let res = {
            ...state,
            textAreaFocused: true
        };
        return res;
    }
    case TEXT_AREA_BLURRED: {
        let res = {
            ...state,
            oldCursorPos: action.data,
            textAreaFocused: false
        };
        return res;
    }
    case MOUSE_ENTER: {
        let res = {
            ...state,
            mouseHovering: true
        };
        return res;
    }
    case MOUSE_LEAVE: {
        let res = {
            ...state,
            mouseHovering: false
        };
        return res;
    }
    case FLASHCARD_HIDE: {
        let res = { ...state };
        res.flashcardToShow = undefined;
        return res;
    }
    case FLASHCARD_DELETED: {
        let flashcard = action.data;
        let res = {
            ...state
        };

        res.note.flashcards = res.note.flashcards.filter(fc => fc.id !== flashcard.id);
        res.flashcardToShow = undefined;

        return res;
    }
    case FLASHCARD_TOGGLE: {
        let res = { ...state };
        let fc = action.data;

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
    case NOTE_SET_PROPERTY: {
        const newNote = { ...state.note };
        newNote[action.data.name] = action.data.value;
        return {
            ...state,
            note: newNote
        }
    };
    case ADD_DECK_REFERENCES_UI_SHOW:
        return {
            ...state,
            addDeckReferencesUI: action.data
        }
    case ADD_FLASH_CARD_UI_SHOW: {
        const showUI = action.data;
        const newState = {
            ...state,
            addFlashCardUI: showUI
        }

        if (showUI) {
            AppStateChange.obtainKeyboard();
        } else {
            AppStateChange.relinquishKeyboard();
        }

        return newState;
    }
    case ADD_NOTE_ABOVE_UI_SHOW: {
        const showUI = action.data;
        const newState = {
            ...state,
            addNoteAboveUI: showUI
        }

        if (showUI) {
            AppStateChange.obtainKeyboard();
        } else {
            AppStateChange.relinquishKeyboard();
        }

        AppStateChange.toolbarMode(ToolbarMode.View);


        return newState;
    }
    case HIDE_ADD_DECKS_UI: {
        const newState = {
            ...state,
            addDeckReferencesUI: false
        };
        AppStateChange.toolbarMode(ToolbarMode.View);

        return newState;
    }
    case ADD_DECKS_COMMIT: {
        const { changes, allDecksForNote } = action.data;

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        AppStateChange.toolbarMode(ToolbarMode.View);

        return {
            ...state,
            decks: allDecksForNote,
            addDeckReferencesUI: false
        }
    }
    case FLASH_CARD_SAVED: {
        let {
            flashcard,
            appState
        } = action.data;

        const newState = {
            ...state,
            addFlashCardUI: false,
        }

        if (newState.note.flashcards) {
            newState.note.flashcards.push(flashcard)
        } else {
            newState.note.flashcards = [flashcard];
        }

        let reviewCount = appState.srReviewCount.value + 1;

        AppStateChange.relinquishKeyboard();
        AppStateChange.setReviewCount(reviewCount);
        AppStateChange.toolbarMode(ToolbarMode.View);

        return newState;
    }
    case TOGGLE_EDITING: {
        const newState = {
            ...state,
            isEditingMarkup: !state.isEditingMarkup
        };

        if (newState.isEditingMarkup) {
            AppStateChange.obtainKeyboard();
        } else {
            AppStateChange.relinquishKeyboard();
            AppStateChange.toolbarMode(ToolbarMode.View);
        }

        return newState;
    }
    case EDITED_NOTE: {
        const newState = {
            ...state,
            isEditingMarkup: false,
            originalContent: state.note.content
        };

        AppStateChange.relinquishKeyboard();
        AppStateChange.toolbarMode(ToolbarMode.View);

        return newState;
    }
    case EDITING_CANCELLED: {
        const newState = {
            ...state,
            isEditingMarkup: false,
            note: {
                ...state.note,
                content: state.originalContent
            }
        };

        AppStateChange.relinquishKeyboard();
        AppStateChange.toolbarMode(ToolbarMode.View);

        return newState;
    }

    default: throw new Error(`unknown action: ${action}`);
    }
};

export default function Note({ note, parentDeck, toolbarMode, onDelete, onEdited, onRefsChanged, onUpdateDeck }: { note?: any, parentDeck?: any, toolbarMode?: any, onDelete?: any, onEdited?: any, onRefsChanged?: any, onUpdateDeck?: any }) {
    const appState = getAppState();


    const initialState: {
        addDeckReferencesUI: boolean;
        addFlashCardUI: boolean;
        addNoteAboveUI: boolean;
        isEditingMarkup: boolean;
        note: any;
        originalContent: string;
        decks: any;
        flashcardToShow: any;
        mouseHovering: boolean;
        oldCursorPos: number;
        textAreaFocused: boolean;
    } = {
        addDeckReferencesUI: false,
        addFlashCardUI: false,
        addNoteAboveUI: false,
        isEditingMarkup: false,
        note: { ...note },
        originalContent: note.content,
        decks: (note && note.decks),
        flashcardToShow: undefined,
        mouseHovering: false,
        oldCursorPos: 0,
        textAreaFocused: false
    };
    const [local, localDispatch] = useLocalReducer(reducer, initialState);

    const hoveringRef = useRef(null);
    const textAreaRef = useRef(null);

    function mouseEnter() {
        localDispatch(MOUSE_ENTER);
    }
    function mouseLeave() {
        localDispatch(MOUSE_LEAVE);
    }

    useEffect(() => {
        // pick up changes to the note's references
        // from the DeckManager::onRefsChanged callback
        localDispatch(NOTE_CHANGED, note);
    }, [note]);

    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current as HTMLElement;
            hc.addEventListener("mouseenter", mouseEnter, false);
            hc.addEventListener("mouseleave", mouseLeave, false);
            return () => {
                if (hoveringRef && hc) {
                    hc.removeEventListener("mouseenter", mouseEnter);
                    hc.removeEventListener("mouseleave", mouseLeave);
                }
            }
        }
        // todo: added to please tsc
        return () => {}
    });

    function handleChangeEvent(event) {
        const target = event.target;
        localDispatch(NOTE_SET_PROPERTY, { name: target.name, value: target.value });
    };

    function onCancelClicked(e) {
        e.preventDefault();
        localDispatch(EDITING_CANCELLED);
    }

    function onSaveEditsClicked(e) {
        e.preventDefault();

        if (hasNoteBeenModified(local)) {
            const id = note.id;

            if (local.note.content.length === 0) {
                local.note.content = "|~placeholder content so that note remains selectable|EMPTY";
            }

            // send updated content to server
            //
            const updatedNote = {
                id: local.note.id,
                kind: local.note.kind,
                content: local.note.content
            };

            // stopped editing and the editable content is different than
            // the original note's text.
            onEdited(id, updatedNote);
            localDispatch(EDITED_NOTE);
        } else {
            localDispatch(TOGGLE_EDITING);
        }
    };

    function onTextAreaFocus() {
        localDispatch(TEXT_AREA_FOCUSED);
    }

    function onTextAreaBlur() {
        if (textAreaRef.current) {
            let tar: HTMLTextAreaElement = textAreaRef.current;
            let cursor = tar.selectionStart;
            localDispatch(TEXT_AREA_BLURRED, cursor);
        }
    }

    function buildEditableContent() {
        return (
        <div class="civil-form">
            <CivilTextArea id="content"
                              value={ local.note.content }
                              elementRef={ textAreaRef }
                              onFocus={ onTextAreaFocus }
                              onBlur={ onTextAreaBlur }
                              onInput={ handleChangeEvent }/>
        </div>);
    };

    function buildAddFlashCardUI() {
        let [flashCardPrompt, setFlashCardPrompt] = useState('');

        function onCancel(e) {
            e.preventDefault();
            localDispatch(ADD_FLASH_CARD_UI_SHOW, false);
        }

        function onSave(e) {
            e.preventDefault();

            let data = {
                noteId: note.id,
                prompt: flashCardPrompt
            };

            Net.post("/api/sr", data).then(newFlashcard => {
                localDispatch(FLASH_CARD_SAVED, {
                    flashcard: newFlashcard,
                    appState
                });
                setFlashCardPrompt('');
            });
        }

        function onInput(e) {
            e.preventDefault();
            setFlashCardPrompt(e.target.value);
        }

        return (
        <div class="block-width form-margin">
            <label>Flash Card Prompt</label>
            <div>
                <CivilTextArea value={ flashCardPrompt }
                               onInput={ onInput }/>
            </div>
            <button onClick={ onCancel }>Cancel</button>
            <button onClick={ onSave }>Save Flash Card Prompt</button>
        </div>);
    }

    function buildAddNoteAboveUI() {

        function onCancelled(e) {
            e.preventDefault();
            localDispatch(ADD_NOTE_ABOVE_UI_SHOW, false);
        };

        function onNoteCreated(allNotes) {
            localDispatch(ADD_NOTE_ABOVE_UI_SHOW, false);
            onUpdateDeck({...parentDeck, notes: allNotes});
        }

        return (<NoteForm label="Insert Note:"
                onCreate={ onNoteCreated }
                onCancel={ onCancelled }
                deckId={ parentDeck.id }
                nextNoteId={ note.id }
                noteKind={ note.kind }
                optionalPointId={ note.pointId }/>);
    }

    function buildAddDecksUI() {

        // todo : there is similar code in SectionDeckRefs

        // todo: fix this typescript interface
        interface IFuckKnows {
            noteId: any;
            referencesChanged: any;
            referencesRemoved:any;
            referencesAdded: any;
            referencesCreated: any;
        };

        function referenceChanges(changes?: any) {
            if (changes) {
                let data = {
                    noteId: note.id,
                    // references_unchanged: changes.referencesUnchanged,
                    referencesChanged: changes.referencesChanged,
                    referencesRemoved: changes.referencesRemoved,
                    referencesAdded: changes.referencesAdded,
                    referencesCreated: changes.referencesCreated
                };

                Net.post<IFuckKnows, any>("/api/edges/notes_decks", data).then((allDecksForNote) => {
                    onRefsChanged(local.note, allDecksForNote);
                    localDispatch(ADD_DECKS_COMMIT, { allDecksForNote, changes });
                });
            } else {
                // cancel was pressed
                localDispatch(HIDE_ADD_DECKS_UI);
            }
        };

        return (
        <div class="block-width form-margin">
            <label>Connections:</label>
            < CivilSelect parentDeckId={ parentDeck.id }
                              chosen={ local.decks }
                              onFinish={ referenceChanges }/>
        </div>);
    };

    function onImagePaste(markup?: any) {
        localDispatch(IMAGE_PASTED, { textAreaRef, markup });
    }

    function buildMainButtons() {
        function confirmedDeleteClicked() {
            onDelete(note.id);
        }

        return (
        <div class="block-width form-margin">
            <button onClick={ onCancelClicked }>Cancel</button>
            <button disabled={!hasNoteBeenModified(local)} onClick={ onSaveEditsClicked }>Save Edits</button>
            <DeleteConfirmation onDelete={ confirmedDeleteClicked }/>
            <ImageSelector onPaste={ onImagePaste } />
        </div>);
    }

    function flashCardDeleted(flashcard?: any) {
        localDispatch(FLASHCARD_DELETED, flashcard);
    }

    let noteClasses = "note selectable-container";
    if (local.mouseHovering && toolbarMode !== ToolbarMode.View) {
        noteClasses += addToolbarSelectableClasses(toolbarMode);
    }

    function onNoteClicked() {
        switch (appState.toolbarMode.value) {
        case ToolbarMode.Edit:
            if (!local.isEditingMarkup) {
                localDispatch(TOGGLE_EDITING);
            }
            break;
        case ToolbarMode.Refs:
            if (!local.addDeckReferencesUI) {
                localDispatch(ADD_DECK_REFERENCES_UI_SHOW, !local.addDeckReferencesUI);
            }
            break;
        case ToolbarMode.SR:
            if (!local.addFlashCardUI) {
                localDispatch(ADD_FLASH_CARD_UI_SHOW, !local.addFlashCardUI);
            }
            break;
        case ToolbarMode.AddAbove:
            if (!local.addNoteAboveUI) {
                localDispatch(ADD_NOTE_ABOVE_UI_SHOW, !local.addNoteAboveUI);
            }
            break;
        }

    }

    return (
    <div class={noteClasses} onClick={onNoteClicked}>
        { local.addNoteAboveUI && buildAddNoteAboveUI() }
        { !local.isEditingMarkup && buildLeftMarginContent(local.note, localDispatch)}

        {  local.isEditingMarkup && buildEditableContent() }
        {  local.flashcardToShow && (
            <FlashCard flashcard={local.flashcardToShow} onDelete={flashCardDeleted}/>)}
        { !local.isEditingMarkup && (
            <div class="note-content selectable-content" ref={hoveringRef}>
                { buildMarkup(local.note.content) }
            </div>)}
        { local.addDeckReferencesUI && buildAddDecksUI() }
        { local.addFlashCardUI && buildAddFlashCardUI() }
        { local.isEditingMarkup && buildMainButtons() }
    </div>);
}

function buildLeftMarginContent(note, localDispatch) {
    let decks = undefined;
    if (note.decks) {
        decks = buildNoteReferences(note.decks);
    }

    let flashcards = undefined;
    if (note.flashcards) {
        flashcards = buildFlashcardIndicator(note.flashcards, localDispatch);
    }

    if (!decks && !flashcards) {
        return <span></span>;
    } else {
        return (
        <div class="left-margin">
            { flashcards }
            { decks && flashcards && <div class="spacer"></div>}
            { decks }
        </div>);
    }
}

function buildNoteReferences(decks?: any) {
    const entries = decks.map(ref => {
        return <Ref deckReference={ref} extraClasses="left-margin-entry"/>;
    });

    return entries;
};

function buildFlashcardIndicator(flashcards?: any, localDispatch?: any) {
    // a single note may have multiple flashcards
    const entries = flashcards.map(fc => {
        const { id } = fc;

        function onFlashcardIconClicked(e: Event) {
            e.preventDefault();
            localDispatch(FLASHCARD_TOGGLE, fc);
        }

        return (
        <div class="left-margin-entry" key={ id }>
            <span class="inlined-blocked" onClick={ onFlashcardIconClicked }>
                {svgFlashCard()}
            </span>
        </div>);
    });

    return entries;
};

function hasNoteBeenModified(local?: any) {
    return local.note.content !== local.originalContent;
};
