import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

export default function TagForm(props) {
  const [name, setName] = useState(props.name || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  const handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setName(value);
  };

  const handleSubmit = (event) => {
    const data = { name };

    if(props.update) {
      // edit an existing tag
      Net.put(`/api/tags/${props.id}`, data).then(props.update);
    } else {
      // create a new tag
      Net.post('/api/tags', data).then(tag => {
        setRedirectUrl(`tags/${tag.id}`);
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
