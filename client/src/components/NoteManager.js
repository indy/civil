import React from 'react';
import { useStateValue } from '../lib/StateProvider';
import { ensureAC } from '../lib/utils';
import Note from './Note';

export default function NoteManager(holder, setMsg) {
  const [state, dispatch] = useStateValue();

  ensureAC(state, dispatch);

  function findNoteWithId(id, modifyFn) {
    const notes = holder.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    setHolder(dispatch, {...holder, notes}, setMsg);
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

function setHolder(dispatch, holder, setMsg) {
  dispatch({
    type: setMsg,
    id: holder.id,
    newItem: holder
  });
}
