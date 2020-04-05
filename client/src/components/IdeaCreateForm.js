import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

export default function IdeaCreateForm() {
  const [title, setTitle] = useState('');
  const [redirectUrl, setRedirectUrl] = useState(false);

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setTitle(value);
    }
  };

  const handleSubmit = (event) => {
    const cleaned_state = { title: title };
    const data = JSON.stringify(cleaned_state);
    Net.createThenRedirectHook(setRedirectUrl, "ideas", data);
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
