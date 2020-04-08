import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function TagForm({ tag, setMsg }) {
  const [state, dispatch] = useStateValue();
  const [name, setName] = useState(tag.name || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setName(value);
  };

  const handleSubmit = (event) => {
    const data = { name };

    if(setMsg) {
      // edit an existing tag
      Net.put(`/api/tags/${tag.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: tag.id,
          newItem
        });
      });
    } else {
      // create a new tag
      Net.post('/api/tags', data).then(tag => {

        // update the app's autocomplete with this explicitly created tag
        //
        // (normally tags are implicitly created on first use and
        // NoteHolder::addNewTagsToAutocomplete updates the state's
        // autocomplete array).
        //
        // Here we're just adding an array of one
        //
        dispatch({
          type: 'addAutocompleteTags',
          tags: [{
            id: tag.id,
            value: tag.name,
            label: tag.name
          }]
        });

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
