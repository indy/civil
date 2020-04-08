import React, { useState } from 'react';

import Net from '../lib/Net';
import Note from './Note';
import NoteForm from './NoteForm';
import NoteUtils from '../lib/NoteUtils';
import SectionLinkBacks from './SectionLinkBacks';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/appUtils';

export default function NoteHolder({holder, setHolder, title, resource, isLoaded, updateForm, children}) {
  const id = holder.id;

  ensureCorrectDeck(resource, id, isLoaded, setHolder);

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
      // Net.delete(`/api/${resource}/${id}`).then(() => {
      //   history.push(`/${resource}`);
      // });
      alert("delete logic has been commented out of FormHandler.js, re-enable if that's what you _REALLY_ want to do");
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
      NoteUtils.addNote(noteForm, ident)
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(holder, setHolder, newNotes);
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

  const notes = NoteManager(holder, setHolder);

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

function ensureCorrectDeck(resource, id, isLoaded, setDeck) {
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$NOTE_HOLDER/:id page
    // and follow a Link to another /$NOTE_HOLDER/:id
    // (where $NOTE_HOLDER is the same type)
    //
    setCurrentId(id);

    if(!isLoaded(id)) {
      // fetch idea from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          setDeck(NoteUtils.applyTagsAndDecksToNotes(s));
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};

function NoteManager(deck, setDeckFn) {
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
    const notes = deck.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setDeckFn({...deck, notes});
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

  const notes = deck.notes ? deck.notes.map(buildNoteComponent) : [];

  return notes;
};
