import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyStrings } from '../lib/utils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function BookForm({book, setMsg}) {
  book = book || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(book.title || '');
  const [author, setAuthor] = useState(book.author || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (book.title && book.title !== '' && title === '') {
    setTitle(book.title);
  }
  if (book.author && book.author !== '' && author === '') {
    setAuthor(book.author);
  }

  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setTitle(value);
    }
    if (name === "author") {
      setAuthor(value);
    }
  };

  const handleSubmit = (event) => {
    const data = removeEmptyStrings({title, author}, ["author"]);

    if(setMsg) {
      // edit an existing book
      Net.put(`/api/books/${book.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: book.id,
          newItem
        });
      });
    } else {
      // create a new book
      Net.post('/api/books', data).then(book => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: book.id,
          value: book.title,
          label: book.title
        });

        setRedirectUrl(`books/${book.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <article>
        <section>
          <form onSubmit={ handleSubmit }>
            <label htmlFor="title">Title:</label>
            <input id="title"
                   type="text"
                   name="title"
                   value={ title }
                   onChange={ handleChangeEvent } />
            <label htmlFor="author">Author:</label>
            <input id="author"
                   type="text"
                   name="author"
                   value={ author }
                   onChange={ handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
