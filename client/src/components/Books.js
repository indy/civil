import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import BookForm from './BookForm';

export default function Books() {
  const [state, dispatch] = useStateValue();
  let [showAddBookForm, setShowAddBookForm] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const books = await Net.get('/api/books');

      dispatch({
        type: 'setBooks',
        books
      });
    }
    if(!state.booksLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddBookForm(!showAddBookForm);
  };

  const booksList = state.books.map(
    book => <ListingLink id={ book.id } key={ book.id } name={ book.title } resource='books'/>
  );

  return (
    <div>
    <h1 onClick={ toggleShowAdd }>{ showAddBookForm ? "Add Book" : "Books" }</h1>
      { showAddBookForm && <BookForm/> }
      <ul>
        { booksList }
      </ul>
    </div>
  );
}
