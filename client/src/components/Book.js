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
    decks_in_notes: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(false);

  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  if (book_id !== currentBookId) {
    // get here on first load and when we're already on a /books/:id page and follow a Link to another /books/:id
    //
    fetchBook();
  }

  function fetchBook() {
    setCurrentBookId(book_id);
    Net.get(`/api/books/${book_id}`).then(bk => {
      if (bk) {
        setBook(NoteUtils.applyTagsAndDecksToNotes(bk));
      } else {
        console.error('fetchBook');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = book.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setBook({...book, notes});
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
      NoteUtils.addNote(noteForm, { book_id })
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(book, setBook, newNotes);
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
