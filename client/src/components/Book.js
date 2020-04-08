import React from 'react';

import BookForm from './BookForm';
import NoteHolder from './NoteHolder';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Book(props) {
  const [state] = useStateValue();
  const book_id = idParam();
  const book = state.book[book_id] || { id: book_id };
  const bookForm = <BookForm book={book} setMsg="setBook" />;

  return (
    <NoteHolder
      holder={ book }
      setMsg="setBook"
      title={ book.title }
      resource="books"
      isLoaded={ id => state.book[id] }
      updateForm={ bookForm }>
      <h2>{ book.author }</h2>
    </NoteHolder>
  );
}
