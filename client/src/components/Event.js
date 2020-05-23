import React, { useState } from 'react';

import DeckManager from './DeckManager';
import EventForm from './EventForm';
import Net from '../lib/Net';
import Point from './Point';
import PointForm from './PointForm';
import SectionLinkBack from './SectionLinkBack';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';

export default function Event(props) {
  const [state, dispatch] = useStateValue();
  const [showPrimeForm, setShowPrimeForm] = useState(false);

  const eventId = idParam();
  const event = state.cache.deck[eventId] || { id: eventId };

  const deckManager = DeckManager({
    deck: event,
    title: event.title,
    resource: "events",
    updateForm: <EventForm event={ event } editing />
  });

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

  return (
    <article>
      { deckManager.title }
      { deckManager.buttons }
      { deckManager.noteForm }
      { deckManager.pointForm }
      { deckManager.updateForm }
      { hasNoPrimePoint(event) && showAddPrimePointMessage() }
      { showPrimeForm && primeForm() }
      { event.points && showPoints(event.points) }
      { deckManager.notes }
      <SectionLinkBack linkbacks={ event.linkbacks_to_decks }/>
    </article>
  );
}

function showPoints(points) {
  return points.map(p => <Point key={ p.id} point={ p } parentResource="events"/>);
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
