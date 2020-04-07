import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../state';

export default function Books() {
  const [state, dispatch] = useStateValue();
  let [showAddBookLink, setShowAddBookLink] = useState(false);

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
    setShowAddBookLink(!showAddBookLink);
  };

  const booksList = state.books.map(
    book => <ListingLink id={ book.id } key={ book.id } name={ book.title } resource='books'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Books</h1>
      { showAddBookLink && <Link to='/add-book'>Add Book</Link> }
      <ul>
        { booksList }
      </ul>
    </div>
  );
}
