import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyObjects, findPoint } from '../lib/utils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';
import CivilPoint from './CivilPoint';

export default function EventForm({event, setMsg}) {
  event = event || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    title: event.title || '',
    point: event.points ? findPoint(event.points, 'Event') : {}
  });

  const [redirectUrl, setRedirectUrl] = useState(false);

  if (event.title && event.title !== '' && localState.title === '') {
    setLocalState({
      ...localState,
      title: event.title
    });
  }

  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const handleChangeEvent = (e) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setLocalState({
        ...localState,
        title: value
      });
    }
  };

  const handleCivilPointChange = (id, point) => {
      setLocalState({
        ...localState,
        point: point
      });
  };

  const handleSubmit = (e) => {
    const data = removeEmptyObjects(localState);

    if (data.point) {
      data.point.title = 'Event';
    }

    if(setMsg) {
      // edit an existing event
      Net.put(`/api/events/${event.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: event.id,
          newItem
        });
      });
    } else {
      // create a new event
      Net.post('/api/events', data).then(event => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: event.id,
          value: event.title,
          label: event.title
        });

        setRedirectUrl(`events/${event.id}`);
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
            <div>
              <label htmlFor="title">Title:</label>
              <input id="title"
                     type="text"
                     name="title"
                     value={ localState.title }
                     autoComplete="off"
                     onChange={ handleChangeEvent } />
            </div>
            <br/>
            <CivilPoint id="point" onPointChange={ handleCivilPointChange } point = { localState.point } />
            <br/>
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
