import React, { useState } from 'react';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import Net from '../lib/Net';
import Note from './Note';
import NoteForm from './NoteForm';
import NoteCompiler from '../lib/NoteCompiler';

import SectionLinkBacks from './SectionLinkBacks';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';

export default function NoteHolder({holder, setMsg, title, resource, isLoaded, updateForm, children}) {
  // UNCOMMENT to enable deleting
  // let history = useHistory();

  const [state, dispatch] = useStateValue();
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const id = holder.id;

  ensureCorrectNoteHolder(resource, id, isLoaded, setMsg, dispatch);

  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const buildButtons = () => {
    let onAddNoteClicked = (event) => {
      setShowNoteForm(!showNoteForm);
      event.preventDefault();
    };

    let onEditParentClicked = (event) => {
      setShowUpdateForm(!showUpdateForm);
      event.preventDefault();
    };

    let onDeleteParentClicked = (event) => {
      // UNCOMMENT to enable deleting
      // Net.delete(`/api/${resource}/${id}`).then(() => {
      //   history.push(`/${resource}`);
      // });

      alert("delete logic has been commented out of NoteHolder.js, re-enable if that's what you _REALLY_ want to do");

      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note...</button>
        <button onClick={ onEditParentClicked }>Edit...</button>
        <button onClick={ onDeleteParentClicked }>Delete...</button>
      </div>
    );
  };

  const buildNoteForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      const ident = resource === "tags" ? { tag_id: id } : { deck_id: id };
      addNote(noteForm, ident)
        .then(newNotes => {
          const notes = holder.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          dispatch({
            type: setMsg,
            id: holder.id,
            newItem: {...holder, notes}
          });

          setShowNoteForm(false);
          setShowUpdateForm(false);
        });
    };

    return (
      <NoteForm onSubmit={ onAddNote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteForm(false);
    setShowUpdateForm(false);
  };

  const showUpdate = () => {
    return updateForm;
  };

  const notes = NoteManager(holder, setMsg);

  return (
    <article>
      <div>
        <h1 onClick={ onShowButtons }>{ title }</h1>
        { showButtons && buildButtons() }
        { showNoteForm && buildNoteForm() }
        { showUpdateForm && showUpdate() }
      </div>
      { children }
      <section>
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ holder }/>
    </article>
  );
}

function ensureCorrectNoteHolder(resource, id, isLoaded, setMsg, dispatch) {
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$NOTE_HOLDER/:id page
    // and follow a Link to another /$NOTE_HOLDER/:id
    // (where $NOTE_HOLDER is the same type)
    //
    setCurrentId(id);

    if(!isLoaded(id)) {
      // fetch resource from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          dispatch({
            type: setMsg,
            id: s.id,
            newItem: applyTagsAndDecksToNotes(s)
          });
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};

function NoteManager(holder, setMsg) {
  const [state, dispatch] = useStateValue();

  ensureAC(state, dispatch);

  const ac = state.ac;

  const addNewTagsToAutocomplete = (someTags) => {
    let newTags = [];

    someTags.forEach(t => {
      let preExisting = ac.tags.some(a => {
        return a.value === t.name;
      });

      if (!preExisting) {
        // this tag was recently created, so add it to the autocomplete list
        newTags.push({
          id: t.id,
          value: t.name,
          label: t.name
        });
      }
    });

    dispatch({
      type: 'addAutocompleteTags',
      tags: newTags
    });
  };

  function findNoteWithId(id, modifyFn) {
    const notes = holder.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    dispatch({
      type: setMsg,
      id: holder.id,
      newItem: {...holder, notes}
    });
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

  function onTagsChanged(note, newTagsCreated) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });

    // add any newly created tags to the autocomplete list
    if(newTagsCreated) {
      addNewTagsToAutocomplete(note.tags);
    }
  };

  function onDecksChanged(note) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  };

  function buildNoteComponent(note) {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onTagsChanged={ onTagsChanged }
            onDecksChanged={ onDecksChanged }
      />
    );
  }

  const notes = holder.notes ? holder.notes.map(buildNoteComponent) : [];

  return notes;
}

function splitIntoNotes(content) {
  const res = NoteCompiler.splitContent(content);
  if (res === null) {
    console.error(`splitIntoNotes error for ${content}`);
  }
  return res;
}

function addNote(form, extra) {
    const notes = splitIntoNotes(form.content.value);
    if (notes === null) {
      console.error("addNote: splitIntoNotes failed");
      console.error(form.content.value);
      return undefined;
    }
    let data = { ...extra,
                 content: notes,
                 title: form.title.value,
                 source: form.source.value,
                 separator: form.separator.checked
               };

    return Net.post("/api/notes", data);
}

function applyTagsAndDecksToNotes(obj) {
  const tagsInNotes = hashByNoteIds(obj.tags_in_notes);
  const decksInNotes = hashByNoteIds(obj.decks_in_notes);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.tags = tagsInNotes[n.id];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

function hashByNoteIds(s) {
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
