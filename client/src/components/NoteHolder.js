import React from 'react';
import Note from './Note';

import {ensureAC} from '../lib/appUtils';

export default function NoteHolder(deck, setDeckFn, state, dispatch) {
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
