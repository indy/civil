import { useParams } from 'react-router-dom';
import React from 'react';

import BookForm from './BookForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';
import { useStateValue } from '../state';

export default function Book(props) {
  const [state, dispatch] = useStateValue();

  const {id} = useParams();
  const book_id = parseInt(id, 10);

  const resource = "books";

  function setBook(newBook) {
    dispatch({
      type: 'setBook',
      id: book_id,
      book: newBook
    });
  }

  function isLoaded(id) {
    return state.book[id];
  }

  ensureCorrectDeck(resource, book_id, isLoaded, setBook);

  const book = state.book[book_id] || { id: book_id };
  const notes = NoteHolder(book, setBook);

  const bookForm = <BookForm id={ book_id }
                             title={ book.title }
                             author={ book.author }
                             update={ setBook }
                   />;
  const formHandler = FormHandler({
    resource,
    id: book_id,
    noteContainer: book,
    setNoteContainer: setBook,
    title: book.title,
    form: bookForm
  });

  return (
    <article>
      { formHandler }
      <h2>{ book.author }</h2>
      <section>
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ book }/>
    </article>
  );
}
