import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyObjects, findPoint } from '../lib/utils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';
import CivilPoint from './CivilPoint';

export default function PersonForm({ person, setMsg }) {
  person = person || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    name: person.name || '',
    birth_point: person.points ? findPoint(person.points, 'Birth') : {},
    death_point: person.points ? findPoint(person.points, 'Death') : {}
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

  const handleCivilPointChange = (id, point) => {
    if (id === 'birth_point') {
      setLocalState({
        ...localState,
        birth_point: point
      });
    } else if (id === 'death_point') {
      setLocalState({
        ...localState,
        death_point: point
      });
    }
  };

  const handleSubmit = (e) => {
    const data = removeEmptyObjects(localState);

    if (data.birth_point) {
      data.birth_point.title = 'Birth';
    }
    if (data.death_point) {
      data.death_point.title = 'Death';
    }

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

        dispatch({
          type: 'addAutocompleteDeck',
          id: person.id,
          value: person.name,
          label: person.name
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

            <fieldset>
              <legend>Born</legend>
              <CivilPoint id="birth_point" onPointChange={ handleCivilPointChange } point = { localState.birth_point } />
            </fieldset>

            <fieldset>
              <legend>Died</legend>
              <CivilPoint id="death_point" onPointChange={ handleCivilPointChange } point = { localState.death_point } />
            </fieldset>

            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
