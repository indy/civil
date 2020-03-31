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
    people_in_notes: [],
    subjects_in_notes: []
  });
  const [scratchNote, setScratchNote] = useState("");
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);

  const [tagsInNotes, setTagsInNotes] = useState({});
  const [subjectsInNote, setSubjectsInNote] = useState({});
  const [peopleInNotes, setPeopleInNotes] = useState({});

  const [currentPointId, setCurrentPointId] = useState(false);

  const ac = AutocompleteCandidates();

  if (point_id !== currentPointId) {
    // get here on first load and when we're already on a /points/:id page and follow a Link to another /points/:id
    //
    fetchPoint();
  }

  function fetchPoint() {
    setCurrentPointId(point_id);
    Net.get(`/api/points/${point.id}`).then(p => {
      if (p) {
        const tagsInNotes = NoteUtils.hashByNoteIds(p.tags_in_notes);
        const peopleInNotes = NoteUtils.hashByNoteIds(p.people_in_notes);
        const subjectsInNotes = NoteUtils.hashByNoteIds(p.subjects_in_notes);

        setPoint(p);
        setTagsInNotes(tagsInNotes);
        setPeopleInNotes(peopleInNotes);
        setSubjectsInNote(subjectsInNotes);
        window.scrollTo(0, 0);
      } else {
        console.error('foooked Point constructor');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = point.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    point.notes = notes; //??
    setPoint(point);
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

  const onAddReference = () => fetchPoint();

  const buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onAddReference={ onAddReference }
            tagsInNote={ tagsInNotes[note.id] }
            peopleInNote={ peopleInNotes[note.id] }
            subjectsInNote={ subjectsInNote[note.id] }
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
        .then(() => {
          fetchPoint();
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
