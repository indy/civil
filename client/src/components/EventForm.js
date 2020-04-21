import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function EventForm({event, setMsg}) {
  event = event || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    title: event.title || ''
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


  const handleSubmit = (e) => {
    const data = {
      title: localState.title.trim()
    };

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
        // get the updated list of events
        Net.get('/api/events').then(events => {
          dispatch({
            type: 'setEvents',
            events
          });

          dispatch({
            type: 'addAutocompleteDeck',
            id: event.id,
            value: event.title,
            label: event.title
          });
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
      <form className="civil-form" onSubmit={ handleSubmit }>
        <label htmlFor="title">Title:</label>
        <br/>
        <input id="title"
               type="text"
               name="title"
               value={ localState.title }
               autoComplete="off"
               onChange={ handleChangeEvent } />
        <br/>
        <input type="submit" value={ setMsg ? "Update Event" : "Create Event"}/>
      </form>
    );
  }
}
