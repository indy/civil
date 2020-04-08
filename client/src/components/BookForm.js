import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyStrings } from '../lib/utils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function BookForm(props) {
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(props.title || '');
  const [author, setAuthor] = useState(props.author || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (props.title && props.title !== '' && title === '') {
    setTitle(props.title);
  }
  if (props.author && props.author !== '' && author === '') {
    setAuthor(props.author);
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

    if(props.update) {
      // edit an existing book
      Net.put(`/api/books/${props.id}`, data).then(props.update);
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
