import { h } from '/js/ext/preact.module.js';
import htm from '/js/ext/htm.module.js';
import { Link, route } from '/js/ext/preact-router.js';
import { useEffect, useState } from '/js/ext/hooks.module.js';

import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';
import { era, filterBefore, filterAfter, filterBetween, yearFrom } from '/js/lib/eras.js';

import PointForm from '/js/components/PointForm.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';

function Events() {
  const html = htm.bind(h);

  const [state, dispatch] = useStateValue();
  let [showAddEventForm, setShowAddEventForm] = useState(false);

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

  function createEventListingAD(ev) {
    return buildEventListing(ev.id, yearText(ev.sort_date, "AD"), ev.title);
  }

  function createEventListing(ev) {
    return buildEventListing(ev.id, yearText(ev.sort_date, ""), ev.title);
  }

  function buildEventListing(id, dateText, title) {
    const html = htm.bind(h);
    const href = `/events/${id}`;

    return html`
    <li key=${ id }>
      <${Link} activeClassName="active" href=${ href }>
        <span class="event-date">${ dateText }</span> ${ title }
      </${Link}>
    </li>`;
  }

  function yearText(dateString, adPostfix) {
    const year = yearFrom(dateString);

    if (year < 0) {
      return `${year * -1} BC`;
    } else {
      return `${year} ${adPostfix}`;
    }
  }

  function eventsList(list, heading) {
    const html = htm.bind(h);
    return html`
    <div>
      ${ !!list.length && html`<h2>${ heading }</h2>` }
      <ul class="events-list">
        ${ list }
      </ul>
    </div>`;
  }



  const uncategorisedEventsList = filterAfter(state.events, era.uncategorisedYear).map(createEventListing);
  const ancientEventsList = filterBefore(state.events, era.ancientCutoff).map(createEventListingAD);
  const medievalEventsList = filterBetween(state.events, era.ancientCutoff, era.medievalCutoff).map(createEventListing);
  const modernEventsList = filterBetween(state.events, era.medievalCutoff, era.modernCutoff).map(createEventListing);
  const contemporaryEventsList = filterBetween(state.events, era.modernCutoff, era.uncategorisedYear).map(createEventListing);

  return html`
    <div>
      <h1 onClick=${ toggleShowAdd }>${ showAddEventForm ? "Add Event" : "Events" }</h1>
      ${ showAddEventForm && html`<${EventForm}/>` }
      ${ eventsList(uncategorisedEventsList, "Uncategorised")}
      ${ eventsList(ancientEventsList, "Ancient")}
      ${ eventsList(medievalEventsList, "Medieval")}
      ${ eventsList(modernEventsList, "Modern")}
      ${ eventsList(contemporaryEventsList, "Contemporary")}
    </div>`;
}

function Event(props) {
  const html = htm.bind(h);

  const [state, dispatch] = useStateValue();
  const [showPrimeForm, setShowPrimeForm] = useState(false);

  const eventId = parseInt(props.id, 10);
  const event = state.cache.deck[eventId] || { id: eventId };

  const deckManager = DeckManager({
    deck: event,
    title: event.title,
    resource: "events",
    updateForm: html`<${EventForm} event=${ event } editing />`
  });

  function onShowPrimeForm() {
    setShowPrimeForm(!showPrimeForm);
  }

  function showAddPrimePointMessage() {
    return html`<p class="fakelink" onClick=${ onShowPrimeForm }>
                  You should add a point for this event
                </p>`;
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
    return html`<${PointForm} readOnlyTitle point=${ point } onSubmit=${ onAddPrimePoint } submitMessage="Create Point"/>`;
  }

  function showPoints(points) {
    const html = htm.bind(h);

    return points.map(p => html`<${Point} key=${ p.id} point=${ p } parentResource="events"/>`);
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


  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.noteForm }
      ${ deckManager.pointForm }
      ${ deckManager.updateForm }
      ${ hasNoPrimePoint(event) && showAddPrimePointMessage() }
      ${ showPrimeForm && primeForm() }
      ${ event.points && showPoints(event.points) }
      ${ deckManager.notes }
      <${SectionLinkBack} linkbacks=${ event.linkbacks_to_decks }/>
    </article>`;
}

function EventForm({ event, editing }) {
  const html = htm.bind(h);

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

    if (editing) {
      // edit an existing event
      Net.put(`/api/events/${event.id}`, data).then(newItem => {
        dispatch({
          type: 'cacheDeck',
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
    // todo: test
    route(redirectUrl, true);
  } else {
    return html`
      <form class="civil-form" onSubmit=${ handleSubmit }>
        <label for="title">Title:</label>
        <br/>
        <input id="title"
               type="text"
               name="title"
               value=${ localState.title }
               autoComplete="off"
               onInput=${ handleChangeEvent } />
        <br/>
        <input type="submit" value=${ editing ? "Update Event" : "Create Event"}/>
      </form>`;
  }
}

function Point({ point, parentResource }) {
  const html = htm.bind(h);

  const [showForm, setShowForm] = useState(false);

  function onShowForm() {
    setShowForm(!showForm);
  }

  function buildShowForm() {
    function handlePointFormSubmit(p) {
      console.log(p);
    }

    return html`<${PointForm}
                  point=${ point }
                  onSubmit=${ handlePointFormSubmit }
                  submitMessage="Update Point">
                 </${PointForm}>`;
  }

  let dom;
  const date = point.date_textual;
  const location = point.location_textual;

  if (parentResource === "events" && point.title === "Prime") {
    dom = html`<p class="subtitle">${ date } ${ location }</p>`;
  } else {
    let text;
    if (location && location.length > 0) {
      if (point.title === "Born" || point.title === "Died") {
        text = `${date} ${point.title} in ${location}`;
      } else {
        // choosing not to display location, even though one is available
        // might change this later, or even use location to show a map
        text = `${date} ${point.title}`;
      }
    } else {
        text = `${date} ${point.title}`;
    }

    dom = html`<p class="subtitle">-${ text }</p>`;
  }

  return html`
    <div onClick=${ onShowForm }>
      ${ dom }
      ${ showForm && buildShowForm() }
    </div>`;
}

export { Events, Event };
