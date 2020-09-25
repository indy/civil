import { html, useState } from '/js/ext/library.js';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import Net from '/js/lib/Net.js';
import { removeEmptyStrings } from '/js/lib/JsUtils.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import { useWasmInterface } from '/js/lib/WasmInterfaceProvider.js';

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
        ${ deck.points && html`<button onClick=${ onAddPointClicked }>Add Point...</button>` }
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
        sortPoints(updatedDeck);
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
    <div class="spanne-entry">
<svg onClick=${ onAddNoteClicked } xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M16.2929 3.29289C16.6834 2.90237 17.3166 2.90237 17.7071 3.29289L20.7071 6.29289C21.0976 6.68342 21.0976 7.31658 20.7071 7.70711L11.7071 16.7071C11.5196 16.8946 11.2652 17 11 17H8C7.44772 17 7 16.5523 7 16V13C7 12.7348 7.10536 12.4804 7.29289 12.2929L16.2929 3.29289ZM9 13.4142V15H10.5858L18.5858 7L17 5.41421L9 13.4142ZM3 7C3 5.89543 3.89543 5 5 5H10C10.5523 5 11 5.44772 11 6C11 6.55228 10.5523 7 10 7H5V19H17V14C17 13.4477 17.4477 13 18 13C18.5523 13 19 13.4477 19 14V19C19 20.1046 18.1046 21 17 21H5C3.89543 21 3 20.1046 3 19V7Z" fill="#666"></path>
</svg>
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
    <div class="spanne-entry">
<svg onClick=${ onCancel } xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#666"></path>
</svg>
    </div>
  </div>
    <form class="civil-add-note-form" onSubmit=${ onSubmit }>
      <label for="content">Append New Note:</label>
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
          // sortPoints(updatedDeck);
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
