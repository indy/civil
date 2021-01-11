import { html, useState, useEffect, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';

import { svgEdit, svgCancel, svgTickedCheckBox, svgUntickedCheckBox } from '/js/svgIcons.js';

import Note from '/js/components/Note.js';
import PointForm from '/js/components/PointForm.js';
import ImageWidget from '/js/components/ImageWidget.js';

const BUTTONS_TOGGLE = 'buttons-toggle';
const UPDATE_FORM_TOGGLE = 'update-form-toggle';
const DELETE_CONFIRMATION_SHOW = 'delete-confirmation-show';
const DELETE_CONFIRMATION_HIDE = 'delete-confirmation-hide';

function reducer(state, action) {
  switch(action.type) {
  case BUTTONS_TOGGLE:
    return {
      ...state,
      showButtons: !state.showButtons,
      showUpdateForm: false
    }
  case UPDATE_FORM_TOGGLE:
    return {
      ...state,
      showUpdateForm: !state.showUpdateForm
    }
  case DELETE_CONFIRMATION_SHOW:
    return {
      ...state,
      showDeleteConfirmation: true
    }
  case DELETE_CONFIRMATION_HIDE:
    return {
      ...state,
      showDeleteConfirmation: false
    }
  default: throw new Error(`unknown action: ${action}`);
  }
}

// preCacheFn performs any one-off calculations before caching the Deck
export default function DeckManager({ deck, title, resource, updateForm, preCacheFn }) {
  // returns helper fn that applies preCacheFn and stores deck in AppState

  const [state, dispatch] = useStateValue();

  function cacheDeck(newdeck) {
    if (preCacheFn) {
      newdeck = preCacheFn(newdeck);
    }

    dispatch({
      type: 'cacheDeck',
      id: newdeck.id,
      newItem: newdeck
    });
  }

  useEffect(() => {
    if(!state.cache.deck[deck.id]) {
      // fetch resource from the server
      const url = `/api/${resource}/${deck.id}`;
      Net.get(url).then(deck => {
        if (deck) {
          cacheDeck(deck);
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }, [deck]);

  const [local, localDispatch] = useLocalReducer(reducer, {
    showButtons: false,
    showUpdateForm: false,
    showDeleteConfirmation: false
  });

  function buildButtons() {
    function onEditParentClicked(e) {
      e.preventDefault();
      localDispatch(UPDATE_FORM_TOGGLE);
    };

    function onDeleteParentClicked(e) {
      e.preventDefault();
      localDispatch(DELETE_CONFIRMATION_SHOW);
    };

    function cancelDeleteClicked(e) {
      e.preventDefault();
      localDispatch(DELETE_CONFIRMATION_HIDE);
    }

    function confirmDeleteClicked(e) {
      e.preventDefault();
      Net.delete(`/api/${resource}/${deck.id}`).then(() => {
        // remove the resource from the app state
        dispatch({
          type: 'deleteDeck',
          id: deck.id
        });
        route(`/${resource}`, true);
      });
      localDispatch(DELETE_CONFIRMATION_HIDE);
    }

    return html`
      <div>
        ${ !local.showDeleteConfirmation && html`<button onClick=${ onEditParentClicked }>Edit...</button>`}
        ${ !local.showDeleteConfirmation && html`<button onClick=${ onDeleteParentClicked }>Delete...</button>`}
        ${ local.showDeleteConfirmation && html`
                                      <span class="delete-confirmation">Really Delete?</span>
                                      <button onClick=${ cancelDeleteClicked }>Cancel</button>
                                      <button onClick=${ confirmDeleteClicked }>Yes Delete</button>`}
      </div>`;
  };

  function onShowButtons(e) {
    e.preventDefault();
    localDispatch(BUTTONS_TOGGLE);
  };

  let res = {};

  res.title = html`<h1 onClick=${ onShowButtons }>${ title }</h1>`;
  if (local.showButtons) {
    res.buttons = buildButtons();
  }

  res.buildPointForm = function(onSuccessCallback) {
    function onAddPoint(point) {
      const url = `/api/${resource}/${deck.id}/points`;
      Net.post(url, point).then(updatedDeck => {
        cacheDeck(updatedDeck);
        onSuccessCallback();
      });
    };

    return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
  };

  if (local.showUpdateForm) {
    res.updateForm = updateForm;
  }

  res.noteManager = function(optional_point) {
    return NoteManager(deck, cacheDeck, optional_point);
  }
  res.pointHasNotes = function(point) {
    return deck.notes.some(n => n.point_id === point.id);
  }

  res.hasNotes = deck.notes && deck.notes.length > 0;

  return res;
}

function NoteForm({ onSubmit, onCancel }) {
  const [content, setContent] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'content') {
      setContent(value);
    }
  };

  return html`
  <div class="append-note">
    <div class="spanne">
      <div class="spanne-entry clickable cancel-offset" onClick=${ onCancel }>
        <span class="spanne-icon-label">Cancel</span>
        ${ svgCancel() }
      </div>
    </div>
    <form class="civil-add-note-form" onSubmit=${ onSubmit }>
      <label for="content">Append Note:</label>
      <br/>
      <textarea id="content"
                type="text"
                class="new-note-textarea"
                name="content"
                value=${ content }
                onInput=${ handleChangeEvent }
      />
      <br/>
      <input type="submit" value="Save"/>
    </form>
    <${ImageWidget}/>
  </div>`;
}

function addNote(markup, deck_id, optional_point_id) {
  const wasmInterface = useWasmInterface();
  const notes = wasmInterface.splitter(markup);

  if (notes === null) {
    console.error(markup);
    return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
  }

  let data = {
    deck_id,
    content: notes
  };

  if (optional_point_id) {
    data.point_id = optional_point_id;
  }

  function isEmptyNote(n) {
    return n.content.every(n => { return n.length === 0;});
  }

  if (isEmptyNote(data)) {
    return new Promise((resolve, reject) => { reject(new Error("Parsed as empty note")); });
  } else {
    return Net.post("/api/notes", data);
  }
}

function NoteManager(deck, cacheDeck, optional_deck_point) {
  var filterFn;
  if (optional_deck_point) {
    // a notemanager for notes associated with the given point_id
    filterFn = n => n.point_id === optional_deck_point.id;
  } else {
    // a notemanager for a deck's top-level notes
    // uses notes which don't have a point_id
    filterFn = n => !n.point_id;
  }


  const [showNoteForm, setShowNoteForm] = useState(false);

  function findNoteWithId(id, modifyFn) {
    const notes = deck.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    cacheDeck({...deck, notes});
  };

  function onEditedNote(id, data) {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  function onDeleteNote(noteId) {
    findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  };

  function onDecksChanged(note, all_decks_for_note) {
    // have to set deck.decks_in_notes to be the canonical version
    // 'cacheDeck' will use that to populate each note's decks array

    // remove all deck.decks_in_notes that relate to this note
    deck.decks_in_notes = deck.decks_in_notes.filter(din => {
      return din.note_id !== note.id;
    });
    // add every note.decks entry to deck.decks_in_notes
    all_decks_for_note.forEach(d => { deck.decks_in_notes.push(d); });

    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  };

  function buildNoteComponent(note) {
    return html`
      <${Note} key=${ note.id }
               note=${ note }
               parentDeckId=${ deck.id }
               onDelete=${ onDeleteNote }
               onEdited=${ onEditedNote }
               onDecksChanged=${ onDecksChanged }
      />`;
  }

  function buildNoteForm() {
    function onCancelAddNote(e) {
      setShowNoteForm(false);
      e.preventDefault();
    };

    function onAddNote(e) {
      e.preventDefault();
      const noteForm = e.target;
      const markup = noteForm.content.value;
      addNote(markup, deck.id, optional_deck_point && optional_deck_point.id)
        .then(newNotes => {
          const notes = deck.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          cacheDeck({...deck, notes});
          setShowNoteForm(false);
          // setShowUpdateForm(false);
        })
        .catch(error => console.error(error.message));
    };

    return html`<${NoteForm} onSubmit=${ onAddNote } onCancel=${ onCancelAddNote } />`;
  };

  function buildNoteFormIcon() {
    function onAddNoteClicked(e) {
      setShowNoteForm(true);
      e.preventDefault();
    };

    if (optional_deck_point) {
      return html`
<div class="inline-append-note">
  <div class="inline-spanne">
    <div class="spanne-entry clickable"  onClick=${ onAddNoteClicked }>
      ${ svgEdit() }
      <span class="spanne-icon-label">Append Note to ${ optional_deck_point.title }</span>
    </div>
  </div>
</div>
`;
    } else {
      return html`
<div class="append-note">
  <div class="spanne">
    <div class="spanne-entry clickable"  onClick=${ onAddNoteClicked }>
      <span class="spanne-icon-label">Append Note</span>
      ${ svgEdit() }
    </div>
  </div>
</div>
`;
    }

  }
  const notes = deck.notes ? deck.notes.filter(filterFn).map(buildNoteComponent) : [];

  return html`
      <section>
        ${ notes }
        ${ showNoteForm ? buildNoteForm() : buildNoteFormIcon() }
      </section>`;
}
