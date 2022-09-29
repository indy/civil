import { h, html, Link, useState, useEffect, useRef } from '/lib/preact/mod.js';

import { AppStateChange, DELUXE_TOOLBAR_VIEW, DELUXE_TOOLBAR_EDIT, DELUXE_TOOLBAR_REFS, DELUXE_TOOLBAR_SR, DELUXE_TOOLBAR_ADD_ABOVE, DELUXE_TOOLBAR_ADD_BELOW } from '/js/AppState.js';

import { svgFlashCard } from '/js/svgIcons.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import CivilSelect from '/js/components/CivilSelect.js';
import CivilTextArea from '/js/components/CivilTextArea.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import FlashCard from '/js/components/FlashCard.js';
import ImageWidget from '/js/components/ImageWidget.js';
import buildMarkup from '/js/components/BuildMarkup.js';
import Ref from '/js/components/Ref.js';

const NOTE_SET_PROPERTY = 'note-set-property';
const ADD_DECK_REFERENCES_UI_SHOW = 'add-deck-references-ui-show';
const ADD_FLASH_CARD_UI_SHOW = 'add-flashcard-ui-show';
const ADD_DECKS_COMMIT = 'add-decks-commit';
const HIDE_ADD_DECKS_UI = 'hide-add-decks-ui';
const FLASH_CARD_SAVED = 'flash-card-saved';
const TOGGLE_EDITING = 'toggle-editing';
const EDITED_NOTE = 'edited-note';
const FLASHCARD_TOGGLE = 'flashcard-toggle';
const FLASHCARD_HIDE = 'flashcard-hide';
const EDITING_CANCELLED = 'editing-cancelled';

const MOUSE_ENTER = "mouse-enter";
const MOUSE_LEAVE = "mouse-leave";

const TEXT_AREA_FOCUSED = 'text-area-focused';
const TEXT_AREA_BLURRED = 'text-area-blurred';
const IMAGE_PASTED = 'image-pasted';

function reducer(state, action) {
    switch(action.type) {
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
    case HIDE_ADD_DECKS_UI: {
        const newState = {
            ...state,
            addDeckReferencesUI: false
        };
        AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

        return newState;
    }
    case ADD_DECKS_COMMIT: {
        const { appState, changes, allDecksForNote } = action.data;

        AppStateChange.noteRefsModified(allDecksForNote, changes);
        AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

        return {
            ...state,
            decks: allDecksForNote,
            addDeckReferencesUI: false
        }
    }
    case FLASH_CARD_SAVED: {
        const newState = {
            ...state,
            addFlashCardUI: false,
        }

        AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

        return newState;
    }
    case TOGGLE_EDITING: {
        const newState = {
            ...state,
            isEditingMarkup: !state.isEditingMarkup
        };

        const appState = action.data;
        if (newState.isEditingMarkup) {
            AppStateChange.obtainKeyboard();
        } else {
            AppStateChange.relinquishKeyboard();
            AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);
        }

        return newState;
    }
    case EDITED_NOTE: {
        const newState = {
            ...state,
            isEditingMarkup: false,
            originalContent: state.note.content
        };

        const appState = action.data;
        AppStateChange.relinquishKeyboard();
        AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

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

        const appState = action.data;
        AppStateChange.relinquishKeyboard();
        AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);

        return newState;
    }

    default: throw new Error(`unknown action: ${action}`);
    }
};



export default function Note(props) {
    const state = useStateValue();

    const initialState = {
        addDeckReferencesUI: false,
        addFlashCardUI: false,
        isEditingMarkup: false,
        note: { ...props.note },
        originalContent: props.note.content,
        decks: (props.note && props.note.decks),
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
        localDispatch(EDITING_CANCELLED, state);
    }

    function onSaveEditsClicked(e) {
        e.preventDefault();

        if (hasNoteBeenModified(local)) {
            const id = props.note.id;

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
            props.onEdited(id, updatedNote);
            localDispatch(EDITED_NOTE, state);
        } else {
            localDispatch(TOGGLE_EDITING, state);
        }
    };

    function onTextAreaFocus() {
        console.log("onTextAreaFocus");
        localDispatch(TEXT_AREA_FOCUSED);
    }

    function onTextAreaBlur() {
        console.log("onTextAreaBlur");
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
                noteId: props.note.id,
                prompt: flashCardPrompt
            };

            Net.post("/api/sr", data).then(res => {
                localDispatch(FLASH_CARD_SAVED);
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
                    noteId: props.note.id,
                    // references_unchanged: changes.referencesUnchanged,
                    referencesChanged: changes.referencesChanged,
                    referencesRemoved: changes.referencesRemoved,
                    referencesAdded: changes.referencesAdded,
                    referencesCreated: changes.referencesCreated
                };

                Net.post("/api/edges/notes_decks", data).then((allDecksForNote) => {
                    props.onRefsChanged(props.note, allDecksForNote);
                    localDispatch(ADD_DECKS_COMMIT, { allDecksForNote, changes, appState: state });
                });
            } else {
                // cancel was pressed
                localDispatch(HIDE_ADD_DECKS_UI);
            }
        };

        return html`
        <div class="block-width">
            <label>Connections:</label>
            <${ CivilSelect } parentDeckId=${ props.parentDeck.id }
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
            props.onDelete(props.note.id);
        }

        if (local.isEditingMarkup) {
            return html`
            <div class="block-width">
                <button onClick=${ onCancelClicked }>Cancel</button>
                <button disabled=${!hasNoteBeenModified(local)} onClick=${ onSaveEditsClicked }>Save Edits</button>
                <${DeleteConfirmation} onDelete=${ confirmedDeleteClicked }/>
                <${ImageWidget} onPaste=${ onImagePaste } />
            </div>`;
        } else {
            return html`<div class="block-width"></div>`;
        }
    }

    function flashCardDeleted() {
        localDispatch(FLASHCARD_HIDE);
    }

    let noteClasses = "note selectable-container";
    if (local.mouseHovering && props.toolbarMode !== DELUXE_TOOLBAR_VIEW) {
        noteClasses += " selectable-container-hovering";
    }

    function onNoteClicked(e) {
        if (state.toolbarMode.value === DELUXE_TOOLBAR_EDIT) {
            if (!local.isEditingMarkup) {
                localDispatch(TOGGLE_EDITING, state);
            }
            return;
        }
        if (state.toolbarMode.value === DELUXE_TOOLBAR_REFS) {
            if (!local.addDeckReferencesUI) {
                localDispatch(ADD_DECK_REFERENCES_UI_SHOW, !local.addDeckReferencesUI);
            }
            return;
        }
        if (state.toolbarMode.value === DELUXE_TOOLBAR_SR) {
            if (!local.addFlashCardUI) {
                localDispatch(ADD_FLASH_CARD_UI_SHOW, !local.addFlashCardUI);
            }
            return;
        }
    }

    return html`
    <div class="${noteClasses}" onClick=${onNoteClicked}>
        ${ !local.isEditingMarkup && buildLeftMarginContent(props.note, localDispatch)}

        ${  local.isEditingMarkup && buildEditableContent() }
        ${  local.flashcardToShow && html`
            <${FlashCard} flashcard=${local.flashcardToShow} onDelete=${flashCardDeleted}/>`}
        ${ local.addDeckReferencesUI && buildAddDecksUI() }
        ${ !local.isEditingMarkup && html`
            <div class="note-content selectable-content" ref=${hoveringRef}>
                ${ buildMarkup(local.note.content) }
            </div>`}
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
            ${flashcards}
            ${ decks && flashcards && html`<div class="spacer"></div>`}
            ${decks}
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
