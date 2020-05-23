import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyStrings } from '../lib/JsUtils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/StateProvider';

export default function PublicationForm({ publication, editing }) {
  publication = publication || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(publication.title || '');
  const [author, setAuthor] = useState(publication.author || '');
  const [source, setSource] = useState(publication.source || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (publication.title && publication.title !== '' && title === '') {
    setTitle(publication.title);
  }
  if (publication.source && publication.source !== '' && source === '') {
    setSource(publication.source);
  }
  if (publication.author && publication.author !== '' && author === '') {
    setAuthor(publication.author);
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
    if (name === "source") {
      setSource(value);
    }
    if (name === "author") {
      setAuthor(value);
    }
  };

  const handleSubmit = (event) => {
    const data = removeEmptyStrings({
      title: title.trim(),
      author: author.trim(),
      source: source.trim()
    }, ["source"]);

    if (editing) {
      // edit an existing publication
      Net.put(`/api/publications/${publication.id}`, data).then(newItem => {
        dispatch({
          type: 'cacheDeck',
          id: publication.id,
          newItem
        });
      });
    } else {
      // create a new publication
      Net.post('/api/publications', data).then(publication => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: publication.id,
          value: publication.title,
          label: publication.title
        });

        setRedirectUrl(`publications/${publication.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <form className="civil-form" onSubmit={ handleSubmit }>
        <label htmlFor="title">Title:</label>
        <br/>
        <input id="title"
               type="text"
               name="title"
               value={ title }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="source">Source:</label>
        <br/>
        <input id="source"
               type="text"
               name="source"
               value={ source }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="author">Author:</label>
        <br/>
        <input id="author"
               type="text"
               name="author"
               value={ author }
               onChange={ handleChangeEvent } />
        <br/>
        <input type="submit" value={ editing ? "Update Publication" : "Create Publication"}/>
      </form>
    );
  }
}
