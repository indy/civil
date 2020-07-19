import { html, useState } from '/js/ext/library.js';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import Net from '/js/lib/Net.js';
import { addChronologicalSortYear } from '/js/lib/eras.js';
import { removeEmptyStrings } from '/js/lib/JsUtils.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import { useWasmInterface } from '/js/lib/WasmInterfaceProvider.js';

import Note from '/js/components/Note.js';
import PointForm from '/js/components/PointForm.js';

export default function DeckManager({ deck, title, resource, updateForm }) {
  // UNCOMMENT to enable deleting
  // let history = useHistory();

  const [state, dispatch] = useStateValue();
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  ensureCorrectDeck(resource, deck.id);   // 2 redraws here

  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const wasmInterface = useWasmInterface();

  function buildButtons() {
    function onAddNoteClicked(e) {
      setShowNoteForm(!showNoteForm);
      e.preventDefault();
    };

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
        <button onClick=${ onAddNoteClicked }>Add Note...</button>
        ${ deck.points && html`<button onClick=${ onAddPointClicked }>Add Point...</button>` }
        <button onClick=${ onEditParentClicked }>Edit...</button>
        <button onClick=${ onDeleteParentClicked }>Delete...</button>
      </div>`;
  };

  // helper fn that can be passed into the NoteManager without exposing cacheDeck or dispatch
  function cacheDeckFn(deck) {
    cacheDeck(dispatch, deck);
  }

  function buildNoteForm() {
    function onAddNote(e) {
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
        });
    };

    return html`<${NoteForm} onSubmit=${ onAddNote }/>`;
  };

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
    setShowNoteForm(false);
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

  if (showNoteForm) {
    res.noteForm = buildNoteForm();
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

  return res;
}

function NoteForm(props) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [separator, setSeparator] = useState('separator');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'content') {
      setContent(value);
    } else if (name === 'title') {
      setTitle(value);
    } else if (name === 'separator') {
      setSeparator(value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit(event);
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="separator">Top Separator:</label>
      <input id="separator"
             type="checkbox"
             name="separator"
             value=${ separator }
             onInput=${ handleChangeEvent }
      />
      <p></p>
      <label for="title">Title:</label>
      <br/>
      <input id="title"
             type="text"
             name="title"
             value=${ title }
             onInput=${ handleChangeEvent }
      />
      <br/>
      <label for="content">Content:</label>
      <br/>
      <textarea id="content"
                type="text"
                name="content"
                value=${ content }
                onInput=${ handleChangeEvent }
      />
      <br/>
      <input type="submit" value="Save note"/>
    </form>`;
}

function sortPoints(holder) {
  if (holder.points) {
    holder.points = holder.points
      .map(addChronologicalSortYear)
      .sort((a, b) => a.sort_year > b.sort_year);
  }
}

function ensureCorrectDeck(resource, id) {
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
          sortPoints(updatedDeck);
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
    console.error("addNote: splitIntoNotes failed");
    console.error(form.content.value);
    return undefined;
  }
    let data = removeEmptyStrings({
        deck_id,
        content: notes,
        title: form.title.value.trim(),
        separator: form.separator.checked
    }, ["title"]);

  return Net.post("/api/notes", data);
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
