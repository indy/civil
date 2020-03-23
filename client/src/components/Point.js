import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

export default function Point(props) {
  let {id} = useParams();
  const point_id = parseInt(id, 10);

  const [point, setPoint] = useState({
    id: parseInt(id, 10),
    notes: [],
    people_referenced: [],
    subjects_referenced: []
  });
  const [scratchNote, setScratchNote] = useState("");
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [ac, setAc] = useState({
    people: [],
    subjects: []
  });
  const [referencedSubjectsHash, setReferencedSubjectsHash] = useState({});
  const [referencedPeopleHash, setReferencedPeopleHash] = useState({});

  const [currentPointId, setCurrentPointId] = useState(false);

  useEffect(() => {
    fetchAutocompleteLists();
  }, []);

  if (point_id !== currentPointId) {
    // get here on first load and when we're already on a /points/:id page and follow a Link to another /points/:id
    //
    fetchPoint();
  }

  function fetchPoint() {
    setCurrentPointId(point_id);
    Net.get(`/api/points/${point.id}`).then(p => {
      if (p) {
        const referencedSubjectsHashNew = p.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHashNew = p.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        setPoint(p);
        setReferencedPeopleHash(referencedPeopleHashNew);
        setReferencedSubjectsHash(referencedSubjectsHashNew);
      } else {
        console.error('foooked Point constructor');
      }
    });
  };

  const fetchAutocompleteLists = () => {
    Net.get("/api/autocomplete/people").then(peopleNew => {
      if (peopleNew) {
        setAc({
          people: peopleNew,
          subjects: ac.subjects
        });
      }
    });

    Net.get("/api/autocomplete/subjects").then(subjectsNew => {
      if (subjectsNew) {
        setAc({
          people: ac.people,
          subjects: subjectsNew
        });
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
            people={ ac.people }
            subjects={ ac.subjects }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onAddReference={ onAddReference }
            referencedPeople={ referencedPeopleHash[note.id] }
            referencedSubjects={ referencedSubjectsHash[note.id] }
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
