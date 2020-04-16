import React, { useState } from 'react';

import EventForm from './EventForm';
import Net from '../lib/Net';
import NoteHolder from './NoteHolder';
import PointForm from './PointForm';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Event(props) {
  const [state, dispatch] = useStateValue();
  const [showPrimeForm, setShowPrimeForm] = useState(false);

  const eventId = idParam();
  const event = state.event[eventId] || { id: eventId };
  const eventForm = <EventForm event={ event } setMsg="setEvent" />;

  function onShowPrimeForm() {
    setShowPrimeForm(!showPrimeForm);
  }

  function showAddPrimePointMessage() {
    return (<p className="fakelink" onClick={ onShowPrimeForm }>You should add a point for this event</p>);
  }

  function onAddPrimePoint(point) {
    Net.post(`/api/events/${eventId}/points`, point).then(event => {
      setShowPrimeForm(false);
      dispatch({
        type: 'setEvent',
        id: event.id,
        newItem: event
      });

      // also update the people list now that this person is no longer uncategorised
      Net.get('/api/events').then(events => {
        dispatch({
          type: 'setEvents',
          events
        });
      });
    });
  }

  function primeForm() {
    let point = {
      title: 'Prime'
    };
    return (<PointForm point={ point } onSubmit={ onAddPrimePoint } submitMessage="Create Point"/>);
  }

  return (
    <NoteHolder
      holder={ event }
      setMsg="setEvent"
      title={ event.title }
      resource="events"
      isLoaded={ id => state.event[id] }
      updateForm={ eventForm }>
      { hasNoPrimePoint(event) && showAddPrimePointMessage() }
      { showPrimeForm && primeForm() }
    </NoteHolder>
  );
}

function hasNoPrimePoint(event) {
  function hasPrimePoint(point) {
    return point.title === "Prime";
  }

  if (event.points) {
    return !event.points.find(hasPrimePoint);
  };
  return false;
}
