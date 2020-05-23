import React, { useState } from 'react';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import PointForm from './PointForm';
import Net from '../lib/Net';
import NoteForm from './NoteForm';
import { cacheDeck } from '../lib/utils';
import { removeEmptyStrings } from '../lib/JsUtils';
import { addChronologicalSortYear } from '../lib/eras';
import { useStateValue } from '../lib/StateProvider';
import { useMarkupValue } from '../lib/MarkupProvider';
import NoteManager from './NoteManager';
import { ensureCorrectDeck } from './EnsureCorrectDeck';

export default function DeckManager({ deck, title, resource, updateForm }) {
  // UNCOMMENT to enable deleting
  // let history = useHistory();

  const [state, dispatch] = useStateValue();
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  ensureCorrectDeck(resource, deck.id);   // 2 redraws here

  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const markup = useMarkupValue();

  function buildButtons() {
    function onAddNoteClicked(e) {
      setShowNoteForm(!showNoteForm);
      e.preventDefault();
    };

    function onAddPointClicked(e) {
      setShowPointForm(!showPointForm);
      e.preventDefault();
    };

    function onEditParentClicked(e) {
      setShowUpdateForm(!showUpdateForm);
      e.preventDefault();
    };

    function onDeleteParentClicked(e) {
      // UNCOMMENT to enable deleting
      // Net.delete(`/api/${resource}/${id}`).then(() => {
      //   history.push(`/${resource}`);
      // });

      alert("delete logic has been commented out of DeckManager.js, re-enable if that's what you _REALLY_ want to do");

      e.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note...</button>
        { deck.points && <button onClick={ onAddPointClicked }>Add Point...</button> }
        <button onClick={ onEditParentClicked }>Edit...</button>
        <button onClick={ onDeleteParentClicked }>Delete...</button>
      </div>
    );
  };

  // helper fn that can be passed into the NoteManager without exposing cacheDeck or dispatch
  function cacheDeckFn(deck) {
    cacheDeck(dispatch, deck);
  }

  function buildNoteForm(markup) {
    function onAddNote(e) {
      const noteForm = e.target;
      addNote(noteForm, deck.id, markup)
        .then(newNotes => {
          const notes = deck.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          cacheDeckFn({...deck, notes});
          setShowNoteForm(false);
          setShowUpdateForm(false);
        });
    };

    return (
      <NoteForm onSubmit={ onAddNote }/>
    );
  };

  function buildPointForm() {
    function onAddPoint(point) {
      const url = `/api/${resource}/${deck.id}/points`;
      Net.post(url, point).then(updatedDeck => {
        sortPoints(updatedDeck);
        cacheDeckFn(updatedDeck);
        setShowPointForm(false);
      });
    };

    return (
      <PointForm onSubmit={ onAddPoint } submitMessage="Create Point"/>
    );
  };

  function onShowButtons() {
    setShowButtons(!showButtons);
    setShowNoteForm(false);
    setShowPointForm(false);
    setShowUpdateForm(false);
  };

  function showUpdate() {
    return updateForm;
  };

  let res = {};

  res.title = <h1 onClick={ onShowButtons }>{ title }</h1>;
  if (showButtons) {
    res.buttons = buildButtons();
  }

  if (showNoteForm) {
    res.noteForm = buildNoteForm(markup);
  }

  if (showPointForm) {
    res.pointForm = buildPointForm();
  }

  if (showUpdateForm) {
    res.updateForm = showUpdate();
  }

  res.notes = NoteManager(deck, cacheDeckFn);

  return res;
}

function sortPoints(deck) {
  if (deck.points) {
    deck.points = deck.points
        .map(addChronologicalSortYear)
        .sort((a, b) => a.sort_year > b.sort_year);
  }
}

function addNote(form, deck_id, markup) {
  const notes = markup.splitter(form.content.value);

  // const notes = splitIntoNotes(form.content.value);
  if (notes === null) {
    console.error("addNote: splitIntoNotes failed");
    console.error(form.content.value);
    return undefined;
  }
    let data = removeEmptyStrings({
        deck_id,
        content: notes,
        title: form.title.value.trim(),
        separator: form.separator.checked
    }, ["title"]);

  return Net.post("/api/notes", data);
}
