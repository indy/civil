import React from 'react';
import { useStateValue } from '../lib/StateProvider';
import { cacheDeck } from '../lib/utils';
import Note from './Note';

export default function NoteManager(holder) {
  const [state, dispatch] = useStateValue();

  if (state) {}                 // use state somehow just to avoid a jslint warning

  function findNoteWithId(id, modifyFn) {
    const notes = holder.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    cacheDeck(dispatch, {...holder, notes});
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
    return (
      <Note key={ note.id }
            note={ note }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onDecksChanged={ onDecksChanged }
      />
    );
  }

  const notes = holder.notes ? holder.notes.map(buildNoteComponent) : [];

  return (
    <section>
      { notes }
    </section>
  );
}
