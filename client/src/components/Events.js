import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import { era, filterBefore, filterAfter, filterBetween } from '../lib/eras';
import EventForm from './EventForm';

export default function Events() {
  const [state, dispatch] = useStateValue();
  let [showAddEventForm, setShowAddEventForm] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const events = await Net.get('/api/events');
      dispatch({
        type: 'setEvents',
        events
      });
    }
    if(!state.eventsLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddEventForm(!showAddEventForm);
  };

  const uncategorisedEventsList = filterAfter(state.events, era.uncategorisedYear).map(createEventListing);
  const ancientEventsList = filterBefore(state.events, era.ancientCutoff).map(createEventListing);
  const medievalEventsList = filterBetween(state.events, era.ancientCutoff, era.medievalCutoff).map(createEventListing);
  const modernEventsList = filterBetween(state.events, era.medievalCutoff, era.modernCutoff).map(createEventListing);
  const contemporaryEventsList = filterBetween(state.events, era.modernCutoff, era.uncategorisedYear).map(createEventListing);

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddEventForm ? "Add Event" : "Events" }</h1>
      { showAddEventForm && <EventForm/> }

      { eventsList(uncategorisedEventsList, "Uncategorised")}
      { eventsList(ancientEventsList, "Ancient")}
      { eventsList(medievalEventsList, "Medieval")}
      { eventsList(modernEventsList, "Modern")}
      { eventsList(contemporaryEventsList, "Contemporary")}

    </div>
  );
}

function eventsList(list, heading) {
  return (<div>
            { !!list.length && <h2>{ heading }</h2> }
            <ul className="events-list">
              { list }
            </ul>
          </div>);
}

function createEventListing(ev) {
  return <ListingLink id={ ev.id } key={ ev.id } name={ ev.title } resource='events'/>;
}
