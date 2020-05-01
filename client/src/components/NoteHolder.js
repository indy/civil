import React, { useState } from 'react';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import DeckPoint from './DeckPoint';
import Point from './Point';
import PointForm from './PointForm';
import Net from '../lib/Net';
import NoteForm from './NoteForm';
import NoteCompiler from '../lib/NoteCompiler';
import NoteManager from './NoteManager';

import SectionLinkBacks from './SectionLinkBacks';
import { useStateValue } from '../lib/state';
import { separateIntoIdeasAndDecks } from '../lib/utils';
import { addChronologicalSortYear } from '../lib/eras';
import { removeEmptyStrings } from '../lib/JsUtils';

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
  const [showPointForm, setShowPointForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

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

      alert("delete logic has been commented out of NoteHolder.js, re-enable if that's what you _REALLY_ want to do");

      e.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note...</button>
        { holder.points && <button onClick={ onAddPointClicked }>Add Point...</button> }
        <button onClick={ onEditParentClicked }>Edit...</button>
        <button onClick={ onDeleteParentClicked }>Delete...</button>
      </div>
    );
  };

  function buildNoteForm() {
    function onAddNote(e) {
      const noteForm = e.target;
      addNote(noteForm, id)
        .then(newNotes => {
          const notes = holder.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          setHolder(dispatch, {...holder, notes}, setMsg);
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
      const url = `/api/${resource}/${holder.id}/points`;
      Net.post(url, point).then(updatedHolder => {
        sortPoints(updatedHolder);
        setHolder(dispatch, updatedHolder, setMsg);
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

  const notes = NoteManager(holder, setMsg);

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ title }</h1>
      { showButtons && buildButtons() }
      { showNoteForm && buildNoteForm() }
      { showPointForm && buildPointForm() }
      { showUpdateForm && showUpdate() }
      { children }
      { holder.points && showPoints(holder.points, resource) }
      { notes }
      <SectionLinkBacks linkingTo={ holder }/>
      { holder.all_points_during_life && showPointsDuringLife(holder.all_points_during_life, holder.id, holder.name) }
    </article>
  );
}

function sortPoints(holder) {
  if (holder.points) {
    holder.points = holder.points
        .map(addChronologicalSortYear)
        .sort((a, b) => a.sort_year > b.sort_year);
  }
}

function setHolder(dispatch, holder, setMsg) {
  dispatch({
    type: setMsg,
    id: holder.id,
    newItem: holder
  });
}

function showPoints(points, resource) {
  return points.map(p => <Point key={ p.id} point={ p } parentResource={ resource }/>);
}

function showPointsDuringLife(deckPoints, holderId, holderName) {
  let dps = deckPoints.map(dp => <DeckPoint key={ dp.point_id} holderId={ holderId } deckPoint={ dp }/>);

  return (
    <section>
      <h2>Events during the life of { holderName }</h2>
      <ul>
        { dps }
      </ul>
    </section>);
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
          let updatedHolder = applyDecksToNotes(s);
          sortPoints(updatedHolder);
          setHolder(dispatch, updatedHolder, setMsg);
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};



function splitIntoNotes(content) {
  const res = NoteCompiler.splitContent(content);
  if (res === null) {
    console.error(`splitIntoNotes error for ${content}`);
  }
  return res;
}

function addNote(form, deck_id) {
  const notes = splitIntoNotes(form.content.value);
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

function applyDecksToNotes(obj) {
  let [ideas, decks] = separateIntoIdeasAndDecks(obj.decks_in_notes);
  const ideasInNotes = hashByNoteIds(ideas);
  const decksInNotes = hashByNoteIds(decks);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.ideas = ideasInNotes[n.id];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

function hashByNoteIds(s) {
  s = s || [];
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
