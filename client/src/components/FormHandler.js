import React, { useState } from 'react';
import NoteUtils from '../lib/NoteUtils';
import NoteForm from './NoteForm';

// ident is an object containing either a noteContainer_id or a tag_id
export default function FormHandler({noteContainer, setNoteContainer, ident, title, form}) {
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showParentForm, setShowParentForm] = useState(false);

  const buildButtons = () => {
    let onAddNoteClicked = (event) => {
      setShowNoteForm(!showNoteForm);
      event.preventDefault();
    };

    let onEditParentClicked = (event) => {
      setShowParentForm(!showParentForm);
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note...</button>
        <button onClick={ onEditParentClicked }>Edit...</button>
        <button >Delete...</button>
      </div>
    );
  };

  const buildNoteForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, ident)
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(noteContainer, setNoteContainer, newNotes);
          setShowNoteForm(false);
        });
    };

    return (
      <NoteForm onSubmit={ onAddNote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteForm(false);
  };

  const showParent = () => {
    return form;
  };

  return (
    <div>
      <h1 onClick={ onShowButtons }>{ title }</h1>
      { showButtons && buildButtons() }
      { showNoteForm && buildNoteForm() }
      { showParentForm && showParent() }
    </div>
  );
}
