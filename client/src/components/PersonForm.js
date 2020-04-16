import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyObjects } from '../lib/JsUtils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function PersonForm({ person, setMsg }) {
  person = person || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    name: person.name || ''
  });

  const [redirectUrl, setRedirectUrl] = useState(false);

  if (person.name && person.name !== '' && localState.name === '') {
    setLocalState({
      ...localState,
      name: person.name
    });
  }

  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const handleChangeEvent = (e) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;

    if (name === "name") {
      setLocalState({
        ...localState,
        name: value
      });
    }
  };

  const handleSubmit = (e) => {
    const data = removeEmptyObjects(localState);

    // if (true) {
    //   console.log(data);
    // } else
    if(setMsg) {
      // edit an existing person
      Net.put(`/api/people/${person.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: person.id,
          newItem
        });
      });
    } else {
      // create a new person
      Net.post('/api/people', data).then(person => {
        // get the updated list of people
        Net.get('/api/people').then(people => {
          dispatch({
            type: 'setPeople',
            people
          });
          dispatch({
            type: 'addAutocompleteDeck',
            id: person.id,
            value: person.name,
            label: person.name
          });
        });
        setRedirectUrl(`people/${person.id}`);
      });
    }


    e.preventDefault();
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
                   value={ localState.name }
                   autoComplete="off"
                   onChange={ handleChangeEvent } />

            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
