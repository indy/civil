import { useParams } from 'react-router-dom';
import React, { useState } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function Point(props) {
  const {id} = useParams();
  const point_id = parseInt(id, 10);

  const [point, setPoint] = useState({
    id: parseInt(id, 10),
    notes: [],
    tags_in_notes: [],
    decks_in_notes: []
  });
  const [scratchNote, setScratchNote] = useState("");
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [currentPointId, setCurrentPointId] = useState(false);

  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  if (point_id !== currentPointId) {
    // get here on first load and when we're already on a /points/:id page and follow a Link to another /points/:id
    //
    fetchPoint();
  }

  function fetchPoint() {
    setCurrentPointId(point_id);
    Net.get(`/api/points/${point_id}`).then(p => {
      if (p) {
        setPoint(NoteUtils.applyTagsAndDecksToNotes(p));
      } else {
        console.error('foooked Point constructor');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = point.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setPoint({...point, notes});
  };

  const onEditedNote = (id, data) => {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  const onDeleteNote = (noteId) => {
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
  }

  function onDecksChanged(note) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  }

  const buildNoteComponent = (note) => {
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
  };

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
      NoteUtils.addNote(noteForm, { point_id })
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(point, setPoint, newNotes);
          setScratchNote("");
          setShowNoteCreateForm(false);
        });
    };

    const onChangeNote = (value) => {
      setScratchNote(value);
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }
                      onChange={ onChangeNote }
                      content={ scratchNote }/>
    );
  };



  const primaryNotes = point.notes.map(buildNoteComponent);

  const onShowButtons = () => {
    setShowButtons(!showButtons);
  };

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ point.title }</h1>
      { showButtons   && buildButtons() }
      { showNoteCreateForm  && buildNoteCreateForm() }
      <PointTime point={ point }/>
      <PointPlace point={ point }/>

      <section className="point-notes">
        { primaryNotes }
      </section>
    </article>
  );
}

function PointTime(props) {
  let timeToDisplay = '';
  if (props.point.date) {
    timeToDisplay = props.point.date.textual;
  }

  return (
    <p className="subtitle">
      Time: { timeToDisplay }
    </p>
  );
}

function PointPlace(props) {
  let locationToDisplay = '';
  if (props.point.location) {
    locationToDisplay = props.point.location.textual;
  }

  return (
    <p className="subtitle">
      Place: { locationToDisplay }
    </p>
  );
}
