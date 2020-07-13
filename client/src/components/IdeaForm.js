import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/StateProvider';

export default function IdeaForm({ idea, editing }) {
  idea = idea || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(idea.title || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (idea.title && idea.title !== '' && title === '') {
    setTitle(idea.title);
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
  };

  const handleSubmit = (event) => {
    const data = {
      title: title.trim()
    };

    if (editing) {
      // edit an existing idea
      Net.put(`/api/ideas/${idea.id}`, data).then(newItem => {
        dispatch({
          type: "cacheDeck",
          id: idea.id,
          newItem
        });
      });
    } else {
      // create a new idea
      Net.post('/api/ideas', data).then(idea => {
        Net.get('/api/ideas/listings').then(ideas => {
          dispatch({
            type: 'setIdeas',
            ideas
          });
          dispatch({
            type: 'addAutocompleteDeck',
            id: idea.id,
            value: idea.title,
            label: idea.title
          });
        });
        setRedirectUrl(`ideas/${idea.id}`);
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
        <input type="submit" value={ editing ? "Update Idea" : "Create Idea"}/>
      </form>
    );
  }
}
