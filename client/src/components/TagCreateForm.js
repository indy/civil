import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

export default function TagCreateForm() {
  const [name, setName] = useState('');
  const [redirectUrl, setRedirectUrl] = useState(false);

  const handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setName(value);
  };

  const handleSubmit = (event) => {
    const data = JSON.stringify({name});
    Net.createThenRedirectHook(setRedirectUrl, "tags", data);
    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <article>
        <section>
          <form onSubmit={ handleSubmit }>

            <label htmlFor="name">Name:</label>
            <input id="name"
                   type="text"
                   name="name"
                   value={ name }
                   autoComplete="off"
                   onChange={ handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
