import React from 'react';

import BookForm from './BookForm';
import NoteHolder from './NoteHolder';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Book(props) {
  const [state, dispatch] = useStateValue();
  const book_id = idParam();

  const book = state.book[book_id] || { id: book_id };
  function setBook(newBook) {
    dispatch({
      type: 'setBook',
      id: book_id,
      book: newBook
    });
  }

  const bookForm = <BookForm id={ book_id }
                             title={ book.title }
                             author={ book.author }
                             update={ setBook }
                   />;

  return (
    <NoteHolder
      holder={ book }
      setHolder={setBook}
      title={book.title}
      resource="books"
      isLoaded={ id => state.book[id] }
      updateForm={bookForm}>
      <h2>{ book.author }</h2>
    </NoteHolder>
  );
}
