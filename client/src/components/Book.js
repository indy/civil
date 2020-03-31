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
    tags_in_notes: [],
    people_in_notes: [],
    subjects_in_notes: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);

  const [tagsInNotes, setTagsInNotes] = useState({});
  const [subjectsInNote, setSubjectsInNote] = useState({});
  const [peopleInNotes, setPeopleInNotes] = useState({});

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
        const tagsInNotes = NoteUtils.hashByNoteIds(bk.tags_in_notes);
        const peopleInNotes = NoteUtils.hashByNoteIds(bk.people_in_notes);
        const subjectsInNotes = NoteUtils.hashByNoteIds(bk.subjects_in_notes);

        setBook(bk);
        setTagsInNotes(tagsInNotes);
        setPeopleInNotes(peopleInNotes);
        setSubjectsInNote(subjectsInNotes);
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
