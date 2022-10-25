import { html, useState, useEffect, useRef } from '/lib/preact/mod.js';

import { getAppState, AppStateChange } from '/js/AppState.js';

import Net from '/js/Net.js';
import { svgFlashCard } from '/js/svgIcons.js';
import { useLocalReducer } from '/js/PreactUtils.js';

import CivilSelect from '/js/components/CivilSelect.js';
import CivilTextArea from '/js/components/CivilTextArea.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import FlashCard from '/js/components/FlashCard.js';
import ImageSelector from '/js/components/ImageSelector.js';
import NoteForm from '/js/components/NoteForm.js';
import Ref from '/js/components/Ref.js';
import buildMarkup from '/js/components/BuildMarkup.js';
import { TOOLBAR_VIEW, TOOLBAR_EDIT, TOOLBAR_REFS, TOOLBAR_SR, TOOLBAR_ADD_ABOVE } from '/js/components/DeluxeToolbar.js';


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

function reducer(state, action) {
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
        return {
            ...state,
            addFlashCardUI: showUI
        }
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

        AppStateChange.toolbarMode(TOOLBAR_VIEW);


        return newState;
    }
    case HIDE_ADD_DECKS_UI: {
        const newState = {
            ...state,
            addDeckReferencesUI: false
        };
        AppStateChange.toolbarMode(TOOLBAR_VIEW);

        return newState;
    }
    case ADD_DECKS_COMMIT: {
        const { changes, allDecksForNote } = action.data;

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        AppStateChange.toolbarMode(TOOLBAR_VIEW);

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

        AppStateChange.setReviewCount(reviewCount);
        AppStateChange.toolbarMode(TOOLBAR_VIEW);

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
            AppStateChange.toolbarMode(TOOLBAR_VIEW);
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
        AppStateChange.toolbarMode(TOOLBAR_VIEW);

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
        AppStateChange.toolbarMode(TOOLBAR_VIEW);

        return newState;
    }

    default: throw new Error(`unknown action: ${action}`);
    }
};

export default function Note({ note, parentDeck, toolbarMode, onDelete, onEdited, onRefsChanged, onUpdateDeck }) {
    const appState = getAppState();

    const initialState = {
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
            hoveringRef.current.addEventListener("mouseenter", mouseEnter, false);
            hoveringRef.current.addEventListener("mouseleave", mouseLeave, false);
            return () => {
                if (hoveringRef && hoveringRef.current) {
                    hoveringRef.current.removeEventListener("mouseenter", mouseEnter);
                    hoveringRef.current.removeEventListener("mouseleave", mouseLeave);
                }
            }
        }
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
        let cursor = textAreaRef.current.selectionStart;
        localDispatch(TEXT_AREA_BLURRED, cursor);
    }

    function buildEditableContent() {
        return html`
        <div class="civil-form">
            <${CivilTextArea} id="content"
                              value=${ local.note.content }
                              elementRef=${ textAreaRef }
                              onFocus=${ onTextAreaFocus }
                              onBlur=${ onTextAreaBlur }
                              onInput=${ handleChangeEvent }/>
        </div>`;
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
            });
        }

        function onInput(e) {
            e.preventDefault();
            setFlashCardPrompt(e.target.value);
        }

        return html`
        <div class="block-width">
            <label>Flash Card Prompt</label>
            <div>
                <${CivilTextArea} value=${ flashCardPrompt }
                                  onInput=${ onInput }/>
            </div>
            <button onClick=${ onCancel }>Cancel</button>
            <button onClick=${ onSave }>Save Flash Card Prompt</button>
        </div>`;
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

        return html`<${NoteForm} label="Insert Note:"
                                 onCreate=${ onNoteCreated }
                                 onCancel=${ onCancelled }
                                 deckId=${ parentDeck.id }
                                 nextNoteId=${ note.id }
                                 noteKind=${ note.kind }
                                 optionalPointId=${ note.pointId }/>`;
    }

    function buildAddDecksUI() {

        function referenceChanges(changes) {
            // todo: what if someone:
            // 1. clicks on edit note
            // 2. adds decks
            // 3. clicks ok (these decks should now be associated with the note)
            // 4. clicks on edit note
            // 5. adds more decks
            // 6. clicks cancel
            // expected: only the changes from step 5 should be undone

            if (changes) {
                let data = {
                    noteId: note.id,
                    // references_unchanged: changes.referencesUnchanged,
                    referencesChanged: changes.referencesChanged,
                    referencesRemoved: changes.referencesRemoved,
                    referencesAdded: changes.referencesAdded,
                    referencesCreated: changes.referencesCreated
                };

                Net.post("/api/edges/notes_decks", data).then((allDecksForNote) => {
                    onRefsChanged(local.note, allDecksForNote);
                    localDispatch(ADD_DECKS_COMMIT, { allDecksForNote, changes });
                });
            } else {
                // cancel was pressed
                localDispatch(HIDE_ADD_DECKS_UI);
            }
        };

        return html`
        <div class="block-width">
            <label>Connections:</label>
            <${ CivilSelect } parentDeckId=${ parentDeck.id }
                              chosen=${ local.decks }
                              onFinish=${ referenceChanges }/>
        </div>`;
    };

    function onImagePaste(markup) {
        localDispatch(IMAGE_PASTED, { textAreaRef, markup });
    }

    function buildMainButtons() {
        let editLabelText = local.isEditingMarkup ? "Save Edits" : "Edit...";

        function confirmedDeleteClicked() {
            onDelete(note.id);
        }

        if (local.isEditingMarkup) {
            return html`
            <div class="block-width">
                <button onClick=${ onCancelClicked }>Cancel</button>
                <button disabled=${!hasNoteBeenModified(local)} onClick=${ onSaveEditsClicked }>Save Edits</button>
                <${DeleteConfirmation} onDelete=${ confirmedDeleteClicked }/>
                <${ImageSelector} onPaste=${ onImagePaste } />
            </div>`;
        } else {
            return html`<div class="block-width"></div>`;
        }
    }

    function flashCardDeleted(flashcard) {
        localDispatch(FLASHCARD_DELETED, flashcard);
    }

    let noteClasses = "note selectable-container";
    if (local.mouseHovering && toolbarMode !== TOOLBAR_VIEW) {
        noteClasses += " selectable-container-hovering";
    }

    function onNoteClicked(e) {
        switch (appState.toolbarMode.value) {
        case TOOLBAR_EDIT:
            if (!local.isEditingMarkup) {
                localDispatch(TOGGLE_EDITING);
            }
            break;
        case TOOLBAR_REFS:
            if (!local.addDeckReferencesUI) {
                localDispatch(ADD_DECK_REFERENCES_UI_SHOW, !local.addDeckReferencesUI);
            }
            break;
        case TOOLBAR_SR:
            if (!local.addFlashCardUI) {
                localDispatch(ADD_FLASH_CARD_UI_SHOW, !local.addFlashCardUI);
            }
            break;
        case TOOLBAR_ADD_ABOVE:
            if (!local.addNoteAboveUI) {
                localDispatch(ADD_NOTE_ABOVE_UI_SHOW, !local.addNoteAboveUI);
            }
            break;
        }

    }

    return html`
    <div class="${noteClasses}" onClick=${onNoteClicked}>
        ${ local.addNoteAboveUI && buildAddNoteAboveUI() }
        ${ !local.isEditingMarkup && buildLeftMarginContent(local.note, localDispatch)}

        ${  local.isEditingMarkup && buildEditableContent() }
        ${  local.flashcardToShow && html`
            <${FlashCard} flashcard=${local.flashcardToShow} onDelete=${flashCardDeleted}/>`}
        ${ !local.isEditingMarkup && html`
            <div class="note-content selectable-content" ref=${hoveringRef}>
                ${ buildMarkup(local.note.content) }
            </div>`}
        ${ local.addDeckReferencesUI && buildAddDecksUI() }
        ${ local.addFlashCardUI && buildAddFlashCardUI() }
        ${ buildMainButtons() }
    </div>`;
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
        return html``;
    } else {
        return html`
        <div class="left-margin">
            ${ flashcards }
            ${ decks && flashcards && html`<div class="spacer"></div>`}
            ${ decks }
        </div>`;
    }
}

function buildNoteReferences(decks) {
    const entries = decks.map(ref => {
        return html`<${Ref} deckReference=${ref} extraClasses="left-margin-entry"/>`;
    });

    return entries;
};

function buildFlashcardIndicator(flashcards, localDispatch) {
    // a single note may have multiple flashcards
    const entries = flashcards.map(fc => {
        const { id, prompt } = fc;

        function onFlashcardIconClicked(e) {
            e.preventDefault();
            localDispatch(FLASHCARD_TOGGLE, fc);
        }

        return html`
        <div class="left-margin-entry" key=${ id }>
            <span class="inlined-blocked" onClick=${ onFlashcardIconClicked }>
                ${svgFlashCard()}
            </span>
        </div>`;
    });

    return entries;
};

function hasNoteBeenModified(local) {
    return local.note.content !== local.originalContent;
};
