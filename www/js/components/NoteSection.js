import { html,  useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { svgEdit, svgCancel } from '/js/svgIcons.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';

import ImageWidget from '/js/components/ImageWidget.js';
import Note from '/js/components/Note.js';
import RollableSection from '/js/components/RollableSection.js';

const NOTE_SECTION_HIDE = 0;
const NOTE_SECTION_SHOW = 1;
const NOTE_SECTION_EXCLUSIVE = 2;

function NoteSection({ heading, noteKind, howToShowFn, deck, cacheDeck }) {
  function noteManager(noteKind) {
    let filterFn = n => (!n.point_id) && n.kind === noteKind;

    let appendLabel = "Append Note";
    if (noteKind === 'NoteSummary') {
      appendLabel = "Append Summary Note";
    } else if (noteKind === 'NoteReview') {
      appendLabel = "Append Review Note";
    }

    return NoteManager({ deck,
                         cacheDeck,
                         filterFn,
                         appendLabel,
                         noteKind
                       });
  }

  let howShow = howToShowFn(noteKind);

  if (howShow === NOTE_SECTION_SHOW) {
    return html`
      <${RollableSection} heading=${heading}>
        ${ noteManager(noteKind) }
      </${RollableSection}>`;
  } else if (howShow === NOTE_SECTION_HIDE) {
    return html`<div></div>`;
  } else if (howShow === NOTE_SECTION_EXCLUSIVE) {
    return html`${ noteManager(noteKind) }`;
  }
}

function NoteManager({ deck, cacheDeck, filterFn, optional_deck_point, appendLabel, noteKind }) {
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
    // have to set deck.refs to be the canonical version
    // 'cacheDeck' will use that to populate each note's decks array

    // remove all deck.refs that relate to this note
    deck.refs = deck.refs.filter(din => {
      return din.note_id !== note.id;
    });
    // add every note.decks entry to deck.refs
    all_decks_for_note.forEach(d => { deck.refs.push(d); });

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
      addNote(markup, deck.id, noteKind, optional_deck_point && optional_deck_point.id)
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
  <div class="left-margin-inline">
    <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
      ${ svgEdit() }
      <span class="left-margin-icon-label">${ appendLabel }</span>
    </div>
  </div>
</div>
`;
    } else {
      return html`
<div class="append-note">
  <div class="left-margin">
    <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
      <span class="left-margin-icon-label">${ appendLabel }</span>
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
    <div class="left-margin">
      <div class="left-margin-entry clickable cancel-offset" onClick=${ onCancel }>
        <span class="left-margin-icon-label">Cancel</span>
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

function addNote(markup, deck_id, noteKind, optional_point_id) {
  const wasmInterface = useWasmInterface();
  const notes = wasmInterface.splitter(markup);

  if (notes === null) {
    console.error(markup);
    return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
  }

  let data = {
    deck_id,
    kind: noteKind,
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

export { NoteSection, NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE }
