import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Book(props) {
  const {id} = useParams();
  const book_id = parseInt(id, 10);

  const [book, setBook] = useState({ id: book_id });

  ensureCorrectDeck(book_id, setBook, "books");

  const creator = NoteCreator(book, setBook, { deck_id: book_id }, book.title);
  const notes = NoteHolder(book, setBook);

  return (
    <article>
      { creator }
      <h2>{ book.author }</h2>
      <section className="book-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ book }/>
    </article>
  );
}
