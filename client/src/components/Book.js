import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import BookForm from './BookForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Book(props) {
  const {id} = useParams();
  const book_id = parseInt(id, 10);

  const [book, setBook] = useState({ id: book_id });

  ensureCorrectDeck(book_id, setBook, "books");

  const notes = NoteHolder(book, setBook);
  const bookForm = <BookForm id={ book_id }
                             title={ book.title }
                             author={ book.author }
                             update={ setBook }
                   />;
  const formHandler = FormHandler({
    noteContainer: book,
    setNoteContainer: setBook,
    ident: { deck_id: book_id },
    title: book.title,
    form: bookForm
  });

  return (
    <article>
      { formHandler }
      <h2>{ book.author }</h2>
      <section className="book-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ book }/>
    </article>
  );
}
