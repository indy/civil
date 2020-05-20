import React, { useState } from 'react';

import DeckControls from './DeckControls';
import EventForm from './EventForm';
import Net from '../lib/Net';
import NoteManager from './NoteManager';
import Point from './Point';
import PointForm from './PointForm';
import SectionLinkBack from './SectionLinkBack';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import { ensureCorrectDeck } from './EnsureCorrectDeck';

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
    return (<PointForm readOnlyTitle point={ point } onSubmit={ onAddPrimePoint } submitMessage="Create Point"/>);
  }

  const resource = "events";
  const setMsg = "setEvent";

  ensureCorrectDeck(resource, event.id, id => state.event[id], setMsg);
  const deckControls = DeckControls({
    holder: event,
    setMsg,
    title: event.title,
    resource,
    updateForm: eventForm
  });

  const notes = NoteManager(event, setMsg);


  return (
    <article>
      { deckControls.title }
      { deckControls.buttons }
      { deckControls.noteForm }
      { deckControls.pointForm }
      { deckControls.updateForm }
      { hasNoPrimePoint(event) && showAddPrimePointMessage() }
      { showPrimeForm && primeForm() }
      { event.points && showPoints(event.points, resource) }
      { notes }
      <SectionLinkBack linkbacks={ event.linkbacks_to_decks }/>
    </article>
  );
}

function showPoints(points, resource) {
  return points.map(p => <Point key={ p.id} point={ p } parentResource={ resource }/>);
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
