import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Books() {
  const [books, setBooks] = useState([]);
  let [showAddBookLink, setShowAddBookLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/books');
        setBooks(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddBookLink(!showAddBookLink);
  };

  const booksList = books.map(
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
