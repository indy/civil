import { h, html, Link, useState, useEffect } from '/lib/preact/mod.js';

import { svgFlashCard } from '/js/svgIcons.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import CivilSelect from '/js/components/CivilSelect.js';
import FlashCard from '/js/components/FlashCard.js';
import ImageWidget from '/js/components/ImageWidget.js';
import buildMarkup from '/js/components/BuildMarkup.js';

const NOTE_SET_PROPERTY = 'note-set-property';
const ADD_DECK_REFERENCES_UI_SHOW = 'add-deck-references-ui-show';
const ADD_FLASH_CARD_UI_SHOW = 'add-flashcard-ui-show';
const DELETE_CONFIRMATION_SHOW = 'delete-confirmation-show';
const DECKS_SET = "decks-set";
const ADD_DECKS_COMMIT = 'add-decks-commit';
const ADD_DECKS_CANCEL = 'add-decks-cancel';
const FLASH_CARD_SAVED = 'flash-card-saved';
const MOD_BUTTONS_TOGGLE = 'mod-buttons-toggle';
const IS_EDITING_MARKUP_TOGGLE = 'is-editing-markup-toggle';
const FLASHCARD_TOGGLE = 'flashcard-toggle';
const FLASHCARD_HIDE = 'flashcard-hide';

function decksStoreOriginalAnnotations(decks) {
  // create a copy of the original annotation in case the user changes the annotation and then presses cancel
  //
  return {
    ...decks,
    annotation_original: decks.annotation
  };
}

function decksRestoreOriginalAnnotations(decks) {
  // restore the annotation using the copy
  return {
    ...decks,
    annotation: decks.annotation_original
  };
}

function reducer(state, action) {
  switch(action.type) {
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
      addFlashCardUI: showUI,
      showModButtons: showUI ? state.showModButtons : false
    }
  }
  case DELETE_CONFIRMATION_SHOW:
    return {
      ...state,
      showDeleteConfirmation: action.data
    }
  case DECKS_SET:
    return {
      ...state,
      decks: action.data
    }
  case ADD_DECKS_COMMIT:
    return {
      ...state,
      decks: action.data.map(decksStoreOriginalAnnotations),
      showModButtons: false,
      addDeckReferencesUI: false
    }
  case ADD_DECKS_CANCEL:
    return {
      ...state,
      decks: action.data.map(decksRestoreOriginalAnnotations),
      showModButtons: false,
      addDeckReferencesUI: false
    }
  case FLASH_CARD_SAVED:
    return {
      ...state,
      showModButtons: false,
      addFlashCardUI: false,
    }
  case MOD_BUTTONS_TOGGLE: {
    const newState = { ...state };

    if (!newState.isEditingMarkup) {
      newState.showModButtons = !newState.showModButtons;
      if (!newState.showModButtons) {
        // reset the state of the 'add references' and 'add flash card' ui
        newState.addDeckReferencesUI = false;
        newState.addFlashCardUI = false;
      }
    }
    return newState;
  }
  case IS_EDITING_MARKUP_TOGGLE: {
    const newState = { ...state };
    newState.isEditingMarkup = !newState.isEditingMarkup;
    if (newState.isEditingMarkup === false) {
      newState.showModButtons = false;
    }

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
};

export default function Note(props) {
  const [state, dispatch] = useStateValue();

  const initialState = {
    showModButtons: false,
    addDeckReferencesUI: false,
    addFlashCardUI: false,
    isEditingMarkup: false,
    showDeleteConfirmation: false,
    note: { content: props.note.content },
    decks: (props.note && props.note.decks && props.note.decks.map(decksStoreOriginalAnnotations)),
    flashcardToShow: undefined
  };
  const [local, localDispatch] = useLocalReducer(reducer, initialState);

  function handleChangeEvent(event) {
    const target = event.target;
    localDispatch(NOTE_SET_PROPERTY, { name: target.name, value: target.value });
  };

  function onEditClicked(e) {
    e.preventDefault();
    const isEditingMarkupNew = !local.isEditingMarkup; // isEditingMarkupNew is the state after the IS_EDITING_MARKUP_TOGGLE dispatch
    localDispatch(IS_EDITING_MARKUP_TOGGLE);

    if (isEditingMarkupNew === false) {
      if (hasNoteBeenModified(local.note, props.note)) {
        const id = props.note.id;

        // send updated content to server
        //
        editNote(id, local.note);

        // stopped editing and the editable content is different than
        // the original note's text.
        props.onEdited(id, local.note);
      }
    }
  };

  function onNoteClicked(e) {
    if (e.target.classList.contains("note-inline-link")) {
      // let the browser handle clicked links normally
    } else {
      // only intercept the clicks to non-link elements
      e.preventDefault();
      localDispatch(MOD_BUTTONS_TOGGLE);
    }
  };

  function buildEditableContent() {
    let res = html`
      <div class="civil-form">
        <textarea id="content"
                  type="text"
                  name="content"
                  value=${ local.note.content }
                  onInput=${ handleChangeEvent }/>
      </div>`;

    return res;
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
        note_id: props.note.id,
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
          <textarea type="text"
                    value=${ flashCardPrompt }
                    onInput=${ onInput }/>
        </div>
        <button onClick=${ onCancel }>Cancel</button>
        <button onClick=${ onSave }>Save Flash Card Prompt</button>
      </div>`;
  }

  function buildAddDecksUI() {
    function cancelAddDecks() {
      // todo: what if someone:
      // 1. clicks on edit note
      // 2. adds decks
      // 3. clicks ok (these decks should now be associated with the note)
      // 4. clicks on edit note
      // 5. adds more decks
      // 6. clicks cancel
      // expected: only the changes from step 5 should be undone

      localDispatch(ADD_DECKS_CANCEL, local.decks);
    };

    function commitAddDecks() {
      addDecks(props.note, local.decks, props.onDecksChanged, dispatch);

      localDispatch(ADD_DECKS_COMMIT, local.decks);
    };

    return html`
      <div class="block-width">
        <label>Connections:</label>
        <${ CivilSelect }
          parentDeckId=${ props.parentDeckId }
          chosen=${ local.decks }
          available=${ state.ac.decks }
          onChange=${ (d) => { localDispatch(DECKS_SET, d);} }
          onCancelAddDecks=${ cancelAddDecks }
          onCommitAddDecks=${ commitAddDecks }
        />
      </div>`;
  };

  function buildMainButtons() {
    let editLabelText;
    if (!local.isEditingMarkup) {
      editLabelText = "Edit...";
    } else if (hasNoteBeenModified(local.note, props.note)) {
      // editing and have made changes
      editLabelText = "Save Edits";
    } else {
      editLabelText = "Stop Editing";
    }

    function eventRegardingDeleteConfirmation(e, newVal) {
      e.preventDefault();
      localDispatch(DELETE_CONFIRMATION_SHOW, newVal);
    }

    function deleteClicked(e) {
      eventRegardingDeleteConfirmation(e, true);
    }
    function confirmDeleteClicked(e) {
      onReallyDelete(props.note.id, props.onDelete);
      eventRegardingDeleteConfirmation(e, false);
    }
    function cancelDeleteClicked(e) {
      eventRegardingDeleteConfirmation(e, false);
    }


    function toggleAddDeckReferencesUI() {
      localDispatch(ADD_DECK_REFERENCES_UI_SHOW, !local.addDeckReferencesUI);
    }

    function toggleAddFlashCardUI() {
      localDispatch(ADD_FLASH_CARD_UI_SHOW, !local.addFlashCardUI);
    }

    return html`
      <div class="block-width">
        ${ !local.isEditingMarkup && html`<button onClick=${ toggleAddDeckReferencesUI }>References...</button>` }
        ${ !local.showDeleteConfirmation && html`<button onClick=${ onEditClicked }>${ editLabelText }</button>`}
        ${ local.isEditingMarkup && !local.showDeleteConfirmation && html`<button onClick=${ deleteClicked }>Delete</button>` }
        ${ local.isEditingMarkup && local.showDeleteConfirmation && html`
                                                    <span class="delete-confirmation">Really Delete?</span>
                                                    <button onClick=${ cancelDeleteClicked }>Cancel</button>
                                                    <button onClick=${ confirmDeleteClicked }>Yes Delete</button>`}
        ${ local.isEditingMarkup && html`<${ImageWidget}/>` }
        ${ !local.isEditingMarkup && html`<button class="add-flash-card" onClick=${ toggleAddFlashCardUI }>Add Flash Card...</button>` }
      </div>
`;
  }

  function flashCardDeleted() {
    localDispatch(FLASHCARD_HIDE);
  }

  return html`
    <div class="note">
      ${  local.isEditingMarkup && buildEditableContent() }
      ${ !local.isEditingMarkup && buildLeftMarginContent(props.note, localDispatch)}
      ${  local.flashcardToShow && html`<${FlashCard} flashcard=${local.flashcardToShow} onDelete=${flashCardDeleted}/>`}
      ${ !local.isEditingMarkup && html`<div onClick=${onNoteClicked}>
                                          ${ buildMarkup(local.note.content, state.imageDirectory) }
                                        </div>`}
      ${ local.showModButtons && local.addDeckReferencesUI && buildAddDecksUI() }
      ${ local.showModButtons && local.addFlashCardUI && buildAddFlashCardUI() }
      ${ local.showModButtons && !local.addDeckReferencesUI && !local.addFlashCardUI && buildMainButtons() }
    </div>
`;
}

function editNote(id, data) {
  const post = {
    id: id,
    ...data
  };

  return Net.put("/api/notes/" + id.toString(), post);
}

function onReallyDelete(id, onDelete) {
  Net.delete("/api/notes/" + id.toString()).then(() => {
    onDelete(id);
  });
};

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
    return html`<div class="left-margin">
                  ${flashcards}
                  ${ decks && flashcards && html`<div class="spacer"></div>`}
                  ${decks}
                </div>`;
  }
}

function buildNoteReferences(decks) {
  const entries = decks.map(ref => {
    const { id, resource, ref_kind, name, annotation } = ref;
    const href = `/${resource}/${id}`;
    return html`
      <div class="left-margin-entry" key=${ id }>
        <span class="ref-kind">(${ ref_kind })</span>
        <${Link} class="ref pigment-${ resource }" href=${ href }>${ name }</${Link}>
        ${annotation && html`<div class="ref-clearer"/>
                             <div class="ref-scribble pigment-fg-${ resource }">${ annotation }</div>
                             <div class="ref-clearer"/>`}
      </div>`;
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

function addDecks(note, decks, onDecksChanged, dispatch) {
  let data = {
    note_id: note.id,
    existing_deck_references: [],
    new_deck_references: []
  };

  // decks would be null if we've removed all decks from a note
  if (decks) {
    data = decks.reduce((acc, deck) => {
      if (deck.__isNew__) {
        acc.new_deck_references.push(deck);
      } else if (deck.id) {
        acc.existing_deck_references.push(deck);
      } else {
        console.error(`deck ${deck.name} has neither __isNew__ nor an id ???`);
        console.error(deck);
      }
      return acc;
    }, data);
  }

  Net.post("/api/edges/notes_decks", data).then((all_decks_for_note) => {
    updateAutocompleteWithNewDecks(dispatch, data.new_deck_references, all_decks_for_note);
    onDecksChanged(note, all_decks_for_note);
  });
}

function updateAutocompleteWithNewDecks(dispatch, newDeckReferences, allDecksForNote) {
  let newDecks = [];

  newDeckReferences.forEach(d => {
    const name = d.name;
    // find the newly created deck in allDecksForNote
    let deck = allDecksForNote.find(d => d.name === name);

    // this deck has just been created, so it isn't in the state's autocomplete list
    if (deck) {
      newDecks.push({
        id: deck.id,
        name: deck.name,
        resource: deck.resource
      });
    } else {
      console.error(`Expected a new deck called '${name}' to have been created by the server`);
    }
  });

  if (newDecks.length > 0) {
    dispatch({
      type: 'addAutocompleteDecks',
      newDecks
    });
  }
}

function hasNoteBeenModified(note, propsNote) {
  return note.content !== propsNote.content;
};
