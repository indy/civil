import React from 'react';
import Note from './Note';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function NoteHolder(deck, setDeck) {
  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  function findNoteWithId(id, modifyFn) {
    const notes = deck.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setDeck({...deck, notes});
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
