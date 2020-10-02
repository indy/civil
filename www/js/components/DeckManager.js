import { html, useState } from '/js/ext/library.js';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import Net from '/js/lib/Net.js';
import { removeEmptyStrings } from '/js/lib/JsUtils.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import { useWasmInterface } from '/js/lib/WasmInterfaceProvider.js';

import { svgAppendNote, svgCancel, svgTickedCheckBox, svgUntickedCheckBox } from '/js/lib/svgIcons.js';

import Note from '/js/components/Note.js';
import PointForm from '/js/components/PointForm.js';
import ImageWidget from '/js/components/ImageWidget.js';

export default function DeckManager({ deck, title, resource, updateForm, afterLoadedFn }) {
  // UNCOMMENT to enable deleting
  // let history = useHistory();

  const [state, dispatch] = useStateValue();

  ensureCorrectDeck(resource, deck.id, afterLoadedFn);   // 2 redraws here

  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const wasmInterface = useWasmInterface();

  function buildButtons() {
    function onAddPointClicked(e) {
      setShowPointForm(!showPointForm);
      e.preventDefault();
    };

    function onEditParentClicked(e) {
      setShowUpdateForm(!showUpdateForm);
      e.preventDefault();
    };

    function onDeleteParentClicked(e) {
      // UNCOMMENT to enable deleting
      // Net.delete(`/api/${resource}/${id}`).then(() => {
      //   history.push(`/${resource}`);
      // });

      alert("delete logic has been commented out of DeckManager.js, re-enable if that's what you _REALLY_ want to do");

      e.preventDefault();
    };

    return html`
      <div>
        ${ deck.points && html`<button onClick=${ onAddPointClicked }>Add Notable Point...</button>` }
        <button onClick=${ onEditParentClicked }>Edit...</button>
        <button onClick=${ onDeleteParentClicked }>Delete...</button>
      </div>`;
  };

  // helper fn that can be passed into the NoteManager without exposing cacheDeck or dispatch
  function cacheDeckFn(deck) {
    cacheDeck(dispatch, deck);
  }

  function buildPointForm() {
    function onAddPoint(point) {
      const url = `/api/${resource}/${deck.id}/points`;
      Net.post(url, point).then(updatedDeck => {
        cacheDeckFn(updatedDeck);
        setShowPointForm(false);
      });
    };

    return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
  };

  function onShowButtons() {
    setShowButtons(!showButtons);
    setShowPointForm(false);
    setShowUpdateForm(false);
  };

  function showUpdate() {
    return updateForm;
  };

  let res = {};

  res.title = html`<h1 onClick=${ onShowButtons }>${ title }</h1>`;
  if (showButtons) {
    res.buttons = buildButtons();
  }

  if (showPointForm) {
    res.pointForm = buildPointForm();
  }

  if (showUpdateForm) {
    res.updateForm = showUpdate();
  }

  const notes = NoteManager(deck, cacheDeckFn);

  res.notes = html`<section>${ notes }</section>`;
  res.hasNotes = notes.length > 0;

  function buildNoteForm() {
    function onCancelAddNote(e) {
      setShowNoteForm(false);
      e.preventDefault();
    };

    function onAddNote(e) {
      e.preventDefault();
      const noteForm = e.target;
      addNote(noteForm, deck.id, wasmInterface)
        .then(newNotes => {
          const notes = deck.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          cacheDeckFn({...deck, notes});
          setShowNoteForm(false);
          setShowUpdateForm(false);
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

    return html`
<div class="append-note">
  <div class="spanne">
    <div class="spanne-entry spanne-clickable"  onClick=${ onAddNoteClicked }>
      <span class="spanne-icon-label">Append Note</span>
      ${ svgAppendNote() }
    </div>
  </div>
</div>
`;
  }

  res.addNote = showNoteForm ? buildNoteForm() : buildNoteFormIcon();

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
      <div class="spanne-entry spanne-clickable" onClick=${ onCancel }>
        <span class="spanne-icon-label">Cancel</span>
        ${ svgCancel() }
      </div>
    </div>
    <form class="civil-add-note-form" onSubmit=${ onSubmit }>
      <label for="content">Append Note:</label>
      <br/>
      <textarea id="content"
                type="text"
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

function ensureCorrectDeck(resource, id, afterLoadedFn) {
  const [state, dispatch] = useStateValue();
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$NOTE_HOLDER/:id page
    // and follow a Link to another /$NOTE_HOLDER/:id
    // (where $NOTE_HOLDER is the same type)
    //
    setCurrentId(id);

    if(!state.cache.deck[id]) {
      // fetch resource from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          let updatedDeck = applyDecksToNotes(s);
          if (afterLoadedFn) {
            updatedDeck = afterLoadedFn(updatedDeck);
          }
          cacheDeck(dispatch, updatedDeck);
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
}

function addNote(form, deck_id, wasmInterface) {
  const notes = wasmInterface.splitter(form.content.value);

  // const notes = splitIntoNotes(form.content.value);
  if (notes === null) {
    console.error(form.content.value);
    return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
  }

  let data = removeEmptyStrings({
    deck_id,
    content: notes
  }, []);

  function isEmptyNote(n) {
    return n.content.every(n => { return n.length === 0;});
  }

  if (isEmptyNote(data)) {
    return new Promise((resolve, reject) => { reject(new Error("Parsed as empty note")); });
  } else {
    return Net.post("/api/notes", data);
  }
}

function NoteManager(holder, cacheDeckFn) {
  function findNoteWithId(id, modifyFn) {
    const notes = holder.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    cacheDeckFn({...holder, notes});
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

  function onDecksChanged(note) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  };

  function buildNoteComponent(note) {
    return html`
      <${Note} key=${ note.id }
               note=${ note }
               parentDeckId=${ holder.id }
               onDelete=${ onDeleteNote }
               onEdited=${ onEditedNote }
               onDecksChanged=${ onDecksChanged }
      />`;
  }

  const notes = holder.notes ? holder.notes.map(buildNoteComponent) : [];

  return notes;
}

function cacheDeck(dispatch, holder) {
  dispatch({
    type: 'cacheDeck',
    id: holder.id,
    newItem: holder
  });
}

function applyDecksToNotes(obj) {
  const decksInNotes = hashByNoteIds(obj.decks_in_notes);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

function hashByNoteIds(s) {
  s = s || [];
  return s.reduce(function(a, b) {
    const note_id = b.note_id;
    if (a[note_id]) {
      a[note_id].push(b);
    } else {
      a[note_id] = [b];
    }
    return a;
  }, {});
}
