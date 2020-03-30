import { useParams } from 'react-router-dom';
import React, { useState } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';
import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function Book(props) {
  const {id} = useParams();
  const book_id = parseInt(id, 10);

  const [book, setBook] = useState({
    id: book_id,
    notes: [],
    people_referenced: [],
    subjects_referenced: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [referencedSubjectsHash, setReferencedSubjectsHash] = useState({});
  const [referencedPeopleHash, setReferencedPeopleHash] = useState({});

  const [currentBookId, setCurrentBookId] = useState(false);

  const ac = AutocompleteCandidates();

  if (book_id !== currentBookId) {
    // get here on first load and when we're already on a /books/:id page and follow a Link to another /books/:id
    //
    fetchBook();
  }

  function fetchBook() {
    setCurrentBookId(book_id);
    Net.get(`/api/books/${book.id}`).then(bk => {
      if (bk) {
        const referencedSubjectsHashNew = bk.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHashNew = bk.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        setBook(bk);
        setReferencedPeopleHash(referencedPeopleHashNew);
        setReferencedSubjectsHash(referencedSubjectsHashNew);
        window.scrollTo(0, 0);
      } else {
        console.error('fetchBook');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = book.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    book.notes = notes; //??
    setBook(book);
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

  const onAddReference = () => fetchBook();

  const buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
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
      NoteUtils.addNote(noteForm, { book_id })
        .then(() => {
          fetchBook();
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

  const notes = book.notes.map(buildNoteComponent);

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ book.title }</h1>
      { showButtons   && buildButtons() }
      { showNoteCreateForm  && buildNoteCreateForm() }
      <h2>{ book.author }</h2>
      <section className="book-notes">
        { notes }
      </section>
    </article>
  );

}
