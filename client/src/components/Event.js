import React from 'react';

import NoteHolder from './NoteHolder';
import EventForm from './EventForm';
import { idParam, findPoint } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Event(props) {
  const [state] = useStateValue();
  const eventId = idParam();
  const event = state.event[eventId] || { id: eventId };
  const eventForm = <EventForm event={ event } setMsg="setEvent" />;

  console.log(event);
  let point = event.points ? findPoint(event.points, "Event") : {};

  return (
    <NoteHolder
      holder={ event }
      setMsg="setEvent"
      title={ event.title }
      resource="events"
      isLoaded={ id => state.event[id] }
      updateForm={ eventForm }>
      <EventTime point={ point }/>
      <EventPlace point={ point }/>
    </NoteHolder>
  );
}

function EventTime({ point }) {
  let timeToDisplay = point.date_textual;

  return (
    <p className="subtitle">
      Time: { timeToDisplay }
    </p>
  );
}

function EventPlace({ point }) {
  let locationToDisplay = point.location_textual;

  return (
    <p className="subtitle">
      Place: { locationToDisplay }
    </p>
  );
}
