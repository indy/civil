import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

export default function ArticleCreateForm() {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [redirectUrl, setRedirectUrl] = useState(false);

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
  };

  const handleSubmit = (event) => {
    const cleaned_state = StateUtils.removeEmptyStrings({title, source}, ["source"]);
    const data = JSON.stringify(cleaned_state);
    Net.createThenRedirectHook(setRedirectUrl, "articles", data);
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
            <label htmlFor="source">Source:</label>
            <input id="source"
                   type="text"
                   name="source"
                   value={ source }
                   onChange={ handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
