import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import {ensureAC} from '../lib/utils';

export default function Events() {
  const [state, dispatch] = useStateValue();
  let [showAddEventLink, setShowAddEventLink] = useState(false);
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
    setShowAddEventLink(!showAddEventLink);
  };

  const eventsList = state.events.map(
    event => <ListingLink id={ event.id } key={ event.id } name={ event.title } resource='events'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Events</h1>
      { showAddEventLink && <Link to='/add-event'>Add Event</Link> }
      <ul>
        { eventsList }
      </ul>
    </div>
  );
}
