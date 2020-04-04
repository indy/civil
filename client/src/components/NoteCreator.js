import React, { useState } from 'react';
import NoteUtils from '../lib/NoteUtils';
import NoteCreateForm from './NoteCreateForm';

// ident is an object containing either a deck_id or a tag_id
export default function NoteCreator(deck, setDeck, ident, title) {
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);

  const buildButtons = () => {
    let onAddNoteClicked = (event) => {
      setShowNoteCreateForm(!showNoteCreateForm);
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note</button>
      </div>
    );
  };

  const buildNoteCreateForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, ident)
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(deck, setDeck, newNotes);
          setShowNoteCreateForm(false);
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteCreateForm(false);
  };

  return (
    <div>
      <h1 onClick={ onShowButtons }>{ title }</h1>
      { showButtons && buildButtons() }
      { showNoteCreateForm && buildNoteCreateForm() }
    </div>
  );
}
