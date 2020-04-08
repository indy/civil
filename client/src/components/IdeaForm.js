import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function IdeaForm(props) {
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(props.title || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (props.title && props.title !== '' && title === '') {
    setTitle(props.title);
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
    const data = { title: title };

    if(props.update) {
      // edit an existing idea
      Net.put(`/api/ideas/${props.id}`, data).then(props.update);
    } else {
      // create a new idea
      Net.post('/api/ideas', data).then(idea => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: idea.id,
          value: idea.title,
          label: idea.title
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
      <article>
        <section>
          <form onSubmit={ handleSubmit }>
            <label htmlFor="title">Title:</label>
            <input id="title"
                   type="text"
                   name="title"
                   value={ title }
                   onChange={ handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
