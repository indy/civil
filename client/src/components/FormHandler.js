import React, { useState } from 'react';
import NoteUtils from '../lib/NoteUtils';
import NoteForm from './NoteForm';

// import Net from '../lib/Net';
// import { useHistory } from 'react-router-dom';

export default function FormHandler({resource, id, noteContainer, setNoteContainer, title, form}) {
  // let history = useHistory();

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
          NoteUtils.appendWithNewNotes(noteContainer, setNoteContainer, newNotes);
          setShowNoteForm(false);
          setShowParentForm(false);
        });
    };

    return (
      <NoteForm onSubmit={ onAddNote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteForm(false);
    setShowParentForm(false);
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
